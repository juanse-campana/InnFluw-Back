import { Response } from 'express';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler, AppError, NotFoundError } from '../utils/errors.js';
import { createDiscountCodeSchema, updateDiscountCodeSchema } from '../utils/schemas.js';
import { prisma } from '../config/database.js';
import { logAudit } from '../services/auth.service.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/constants.js';

export const getDiscountCodes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const isActive = req.query.isActive as string | undefined;

  const where: Record<string, unknown> = { userId: req.user!.userId };
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const codes = await prisma.discountCode.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      drops: {
        include: { drop: { select: { id: true, title: true, slug: true } } },
      },
      _count: { select: { orders: true } },
    },
  });

  res.json({
    success: true,
    data: { codes },
  });
});

export const getDiscountCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const code = await prisma.discountCode.findFirst({
    where: { id, userId: req.user!.userId },
    include: {
      drops: {
        include: { drop: true },
      },
      _count: { select: { orders: true } },
    },
  });

  if (!code) {
    throw new NotFoundError('Código de descuento no encontrado');
  }

  res.json({
    success: true,
    data: { code },
  });
});

export const createDiscountCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = createDiscountCodeSchema.parse(req.body);

  const existingCode = await prisma.discountCode.findUnique({
    where: { code: data.code },
  });

  if (existingCode) {
    throw new AppError(400, ERROR_MESSAGES.CODE_EXISTS);
  }

  const userDrops = await prisma.drop.findMany({
    where: {
      id: { in: data.dropIds },
      userId: req.user!.userId,
    },
    select: { id: true },
  });

  if (userDrops.length !== data.dropIds.length) {
    throw new AppError(400, 'Algunos drops seleccionados no existen o no te pertenecen');
  }

  const code = await prisma.discountCode.create({
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      minAmount: data.minAmount,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: data.isActive,
      userId: req.user!.userId,
      drops: {
        create: data.dropIds.map((dropId) => ({ dropId })),
      },
    },
    include: {
      drops: { include: { drop: true } },
    },
  });

  await logAudit('discountCode.created', 'DiscountCode', code.id, req.user!.userId);

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.CODE_CREATED,
    data: { code },
  });
});

export const updateDiscountCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const data = updateDiscountCodeSchema.parse(req.body);

  const existingCode = await prisma.discountCode.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!existingCode) {
    throw new NotFoundError('Código de descuento no encontrado');
  }

  if (data.code && data.code !== existingCode.code) {
    const codeExists = await prisma.discountCode.findUnique({
      where: { code: data.code },
    });

    if (codeExists) {
      throw new AppError(400, ERROR_MESSAGES.CODE_EXISTS);
    }
  }

  const code = await prisma.discountCode.update({
    where: { id },
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      minAmount: data.minAmount,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      isActive: data.isActive,
    },
    include: {
      drops: { include: { drop: true } },
    },
  });

  if (data.dropIds) {
    const userDrops = await prisma.drop.findMany({
      where: { id: { in: data.dropIds }, userId: req.user!.userId },
      select: { id: true },
    });

    if (userDrops.length !== data.dropIds.length) {
      throw new AppError(400, 'Algunos drops seleccionados no existen o no te pertenecen');
    }

    await prisma.discountCodeDrop.deleteMany({ where: { discountCodeId: id } });
    await prisma.discountCodeDrop.createMany({
      data: data.dropIds.map((dropId: string) => ({ discountCodeId: id, dropId })),
    });
  }

  await logAudit('discountCode.updated', 'DiscountCode', id, req.user!.userId, data);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.CODE_UPDATED,
    data: { code },
  });
});

export const deleteDiscountCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const code = await prisma.discountCode.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!code) {
    throw new NotFoundError('Código de descuento no encontrado');
  }

  await prisma.discountCode.delete({ where: { id } });

  await logAudit('discountCode.deleted', 'DiscountCode', id, req.user!.userId);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.CODE_DELETED,
  });
});

export const validateDiscountCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const code = req.query.code as string | undefined;
  const dropId = req.query.dropId as string | undefined;
  const amount = req.query.amount as string | undefined;

  if (!code || !dropId) {
    throw new AppError(400, 'Código y dropId son requeridos');
  }

  const discountCode = await prisma.discountCode.findFirst({
    where: {
      code: code as string,
      isActive: true,
      drops: { some: { dropId: dropId as string } },
    },
    include: { drops: true },
  });

  if (!discountCode) {
    res.json({ success: true, data: { valid: false, reason: 'Código no válido o no aplicable a este producto' } });
    return;
  }

  if (discountCode.expiresAt && new Date() > discountCode.expiresAt) {
    res.json({ success: true, data: { valid: false, reason: 'El código ha expirado' } });
    return;
  }

  if (discountCode.maxUses && discountCode.uses >= discountCode.maxUses) {
    res.json({ success: true, data: { valid: false, reason: 'El código ha alcanzado su límite de usos' } });
    return;
  }

  if (discountCode.minAmount && amount && parseFloat(amount as string) < discountCode.minAmount) {
    res.json({
      success: true,
      data: {
        valid: false,
        reason: `Monto mínimo de $${discountCode.minAmount} requerido`,
      },
    });
    return;
  }

  const subtotal = parseFloat(amount as string);
  const discountAmount = discountCode.type === 'PERCENTAGE'
    ? (subtotal * discountCode.value) / 100
    : discountCode.value;

  res.json({
    success: true,
    data: {
      valid: true,
      code: {
        type: discountCode.type,
        value: discountCode.value,
        discount: Math.min(discountAmount, subtotal),
      },
    },
  });
});
