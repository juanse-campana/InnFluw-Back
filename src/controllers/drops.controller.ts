import { Response } from 'express';
import slugify from 'slugify';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler, AppError, NotFoundError } from '../utils/errors.js';
import { createDropSchema, updateDropSchema } from '../utils/schemas.js';
import { prisma } from '../config/database.js';
import { logAudit } from '../services/auth.service.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/constants.js';

const generateUniqueSlug = async (baseSlug: string, userId: string): Promise<string> => {
  let slug = slugify(baseSlug, { lower: true, strict: true });
  let counter = 1;

  while (true) {
    const existing = await prisma.drop.findFirst({
      where: { slug },
    });

    if (!existing) break;
    slug = `${slugify(baseSlug, { lower: true, strict: true })}-${counter}`;
    counter++;
  }

  return slug;
};

export const getDrops = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, category, page = '1', limit = '20' } = req.query;

  const where: any = { userId: req.user!.userId };

  if (status) where.status = status;
  if (category) where.category = category;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [drops, total] = await Promise.all([
    prisma.drop.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        _count: {
          select: { orders: true },
        },
      },
    }),
    prisma.drop.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      drops,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

export const getDrop = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const drop = await prisma.drop.findFirst({
    where: {
      id,
      userId: req.user!.userId,
    },
    include: {
      discountCodes: {
        where: { discountCode: { isActive: true } },
        include: { discountCode: true },
      },
      _count: {
        select: { orders: true, visitors: true },
      },
    },
  });

  if (!drop) {
    throw new NotFoundError(ERROR_MESSAGES.DROP_NOT_FOUND);
  }

  res.json({
    success: true,
    data: { drop },
  });
});

export const getDropBySlug = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  const drop = await prisma.drop.findUnique({
    where: { slug },
    include: {
      user: {
        select: { id: true, name: true, avatar: true },
      },
      discountCodes: {
        where: { discountCode: { isActive: true } },
        include: { discountCode: true },
      },
    },
  });

  if (!drop) {
    throw new NotFoundError(ERROR_MESSAGES.DROP_NOT_FOUND);
  }

  res.json({
    success: true,
    data: { drop },
  });
});

export const createDrop = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = createDropSchema.parse(req.body);

  const existingSlug = await prisma.drop.findUnique({
    where: { slug: data.slug },
  });

  if (existingSlug) {
    throw new AppError(400, ERROR_MESSAGES.SLUG_EXISTS);
  }

  const drop = await prisma.drop.create({
    data: {
      ...data,
      userId: req.user!.userId,
    },
  });

  await logAudit('drop.created', 'Drop', drop.id, req.user!.userId);

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.DROP_CREATED,
    data: { drop },
  });
});

export const updateDrop = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = updateDropSchema.parse(req.body);

  const existingDrop = await prisma.drop.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!existingDrop) {
    throw new NotFoundError(ERROR_MESSAGES.DROP_NOT_FOUND);
  }

  if (data.slug && data.slug !== existingDrop.slug) {
    const slugExists = await prisma.drop.findUnique({
      where: { slug: data.slug },
    });

    if (slugExists) {
      throw new AppError(400, ERROR_MESSAGES.SLUG_EXISTS);
    }
  }

  const drop = await prisma.drop.update({
    where: { id },
    data,
  });

  await logAudit('drop.updated', 'Drop', drop.id, req.user!.userId, data);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DROP_UPDATED,
    data: { drop },
  });
});

export const deleteDrop = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const drop = await prisma.drop.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!drop) {
    throw new NotFoundError(ERROR_MESSAGES.DROP_NOT_FOUND);
  }

  await prisma.drop.delete({ where: { id } });

  await logAudit('drop.deleted', 'Drop', id, req.user!.userId);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.DROP_DELETED,
  });
});

export const trackVisitor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { dropId } = req.body;
  const { sessionId } = req.query;

  const drop = await prisma.drop.findUnique({ where: { id: dropId as string } });
  if (!drop) {
    throw new NotFoundError(ERROR_MESSAGES.DROP_NOT_FOUND);
  }

  const visitor = await prisma.visitor.create({
    data: {
      dropId: dropId as string,
      sessionId: sessionId as string || null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId,
    },
  });

  res.status(201).json({
    success: true,
    data: { visitorId: visitor.id },
  });
});
