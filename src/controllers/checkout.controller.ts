import { Response } from 'express';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler, AppError, NotFoundError } from '../utils/errors.js';
import { checkoutSchema } from '../utils/schemas.js';
import { prisma } from '../config/database.js';
import { logAudit, generateConfirmationToken } from '../services/auth.service.js';
import { addOrderEmailJob, addWebhookJob } from '../services/queue.service.js';
import { addStockAlertJob } from '../services/queue.service.js';
import { sendLowStockAlert } from '../services/email.service.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants.js';

export const simulateCheckout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = checkoutSchema.parse(req.body);

  const drop = await prisma.drop.findUnique({
    where: { id: data.dropId },
    include: { user: true },
  });

  if (!drop) {
    throw new NotFoundError(ERROR_MESSAGES.DROP_NOT_FOUND);
  }

  if (drop.status !== 'LIVE') {
    throw new AppError(400, ERROR_MESSAGES.DROP_NOT_LIVE);
  }

  if (drop.stock <= 0) {
    throw new AppError(400, ERROR_MESSAGES.OUT_OF_STOCK);
  }

  let discount = 0;
  let discountCodeId: string | null = null;

  if (data.discountCode) {
    const code = await prisma.discountCode.findFirst({
      where: {
        code: data.discountCode,
        isActive: true,
        drops: { some: { dropId: data.dropId } },
      },
    });

    if (!code) {
      throw new AppError(400, ERROR_MESSAGES.CODE_NOT_APPLICABLE);
    }

    if (code.expiresAt && new Date() > code.expiresAt) {
      throw new AppError(400, ERROR_MESSAGES.CODE_EXPIRED);
    }

    if (code.maxUses && code.uses >= code.maxUses) {
      throw new AppError(400, ERROR_MESSAGES.CODE_MAX_USES);
    }

    if (code.minAmount && drop.price < code.minAmount) {
      throw new AppError(400, ERROR_MESSAGES.CODE_MIN_AMOUNT);
    }

    discountCodeId = code.id;

    if (code.type === 'PERCENTAGE') {
      discount = (drop.price * code.value) / 100;
    } else {
      discount = Math.min(code.value, drop.price);
    }
  }

  const subtotal = drop.price;
  const total = Math.max(0, subtotal - discount);
  const confirmationToken = generateConfirmationToken();

  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        dropId: data.dropId,
        userId: drop.userId,
        discountCodeId,
        buyerEmail: data.buyerEmail,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        buyerAddress: data.buyerAddress,
        buyerCity: data.buyerCity,
        buyerCountry: data.buyerCountry,
        subtotal,
        discount,
        total,
        status: 'PENDING',
        confirmationToken,
      },
      include: {
        drop: true,
        discountCode: true,
      },
    }),
    prisma.drop.update({
      where: { id: data.dropId },
      data: { stock: { decrement: 1 } },
    }),
  ]);

  if (discountCodeId) {
    await prisma.discountCode.update({
      where: { id: discountCodeId },
      data: { uses: { increment: 1 } },
    });
  }

  if (drop.stock - 1 <= 5 && drop.stock - 1 > 0) {
    addStockAlertJob({
      dropId: drop.id,
      dropTitle: drop.title,
      influencerEmail: drop.user.email,
      remainingStock: drop.stock - 1,
    });
  }

  if (drop.stock - 1 === 0) {
    await prisma.drop.update({
      where: { id: drop.id },
      data: { status: 'SOLD_OUT' },
    });
  }

  await addOrderEmailJob({
    type: 'buyer_confirmation',
    data: {
      buyerEmail: data.buyerEmail,
      buyerName: data.buyerName,
      orderId: order.id,
      dropTitle: drop.title,
      total,
      confirmationToken,
    },
  });

  await addOrderEmailJob({
    type: 'influencer_notification',
    data: {
      influencerEmail: drop.user.email,
      influencerName: drop.user.name,
      buyerName: data.buyerName,
      buyerEmailForBuyer: data.buyerEmail,
      orderId: order.id,
      dropTitle: drop.title,
      total,
      discount,
    },
  });

  await addWebhookJob('order.created', {
    dropId: data.dropId,
    orderId: order.id,
    payload: {
      orderId: order.id,
      buyerEmail: data.buyerEmail,
      buyerName: data.buyerName,
      total,
      discount,
    },
  });

  await logAudit('order.created', 'Order', order.id, undefined, {
    dropId: data.dropId,
    buyerEmail: data.buyerEmail,
    total,
  });

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.ORDER_CREATED,
    data: {
      order: {
        id: order.id,
        status: order.status,
        total,
        confirmationUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/orders/confirm/${confirmationToken}`,
      },
    },
  });
});

export const confirmOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.params;

  const order = await prisma.order.findUnique({
    where: { confirmationToken: token },
    include: { drop: true, user: true },
  });

  if (!order) {
    throw new NotFoundError(ERROR_MESSAGES.CONFIRMATION_TOKEN_INVALID);
  }

  if (order.status !== 'PENDING') {
    throw new AppError(400, 'Esta orden ya ha sido procesada');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });

  await addWebhookJob('order.confirmed', {
    dropId: order.dropId,
    orderId: order.id,
    payload: {
      orderId: order.id,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      total: order.total,
    },
  });

  await logAudit('order.confirmed', 'Order', order.id, undefined, {
    previousStatus: 'PENDING',
    newStatus: 'CONFIRMED',
  });

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.ORDER_CONFIRMED,
    data: {
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        confirmedAt: updatedOrder.confirmedAt,
      },
    },
  });
});

export const getOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { dropId, status, page = '1', limit = '20' } = req.query;

  const where: any = { userId: req.user!.userId };
  if (dropId) where.dropId = dropId;
  if (status) where.status = status;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        drop: { select: { id: true, title: true, slug: true } },
        discountCode: { select: { id: true, code: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

export const getOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const order = await prisma.order.findFirst({
    where: { id, userId: req.user!.userId },
    include: {
      drop: true,
      discountCode: { select: { id: true, code: true, type: true, value: true } },
    },
  });

  if (!order) {
    throw new NotFoundError(ERROR_MESSAGES.ORDER_NOT_FOUND);
  }

  res.json({
    success: true,
    data: { order },
  });
});
