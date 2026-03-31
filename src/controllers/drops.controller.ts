import { Response } from "express";
import { AuthRequest } from "../utils/jwt.js";
import { asyncHandler, AppError, NotFoundError } from "../utils/errors.js";
import { createDropSchema, updateDropSchema } from "../utils/schemas.js";
import { prisma } from "../config/database.js";
import { logAudit } from "../services/auth.service.js";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "../config/constants.js";

export const getDrops = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const page = (req.query.page as string) || "1";
    const limit = (req.query.limit as string) || "20";

    const where: Record<string, unknown> = { userId: req.user!.userId };

    if (status) where.status = status;
    if (category) where.category = category;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [drops, total] = await Promise.all([
      prisma.drop.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
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
  },
);

export const getDrop = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

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
    throw new NotFoundError("Drop no encontrado");
  }

  res.json({
    success: true,
    data: { drop },
  });
});

export const getDropBySlug = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const slug = req.params.slug as string;

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
      throw new NotFoundError("Drop no encontrado");
    }

    res.json({
      success: true,
      data: { drop },
    });
  },
);

export const createDrop = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = createDropSchema.parse(req.body);

    const existingSlug = await prisma.drop.findUnique({
      where: { slug: data.slug as string },
    });

    if (existingSlug) {
      throw new AppError(400, ERROR_MESSAGES.SLUG_EXISTS);
    }

    const drop = await prisma.drop.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        category: data.category,
        price: data.price,
        stock: data.stock,
        productImage: data.productImage,
        status: data.status,
        config: data.config as object,
        userId: req.user!.userId,
      },
    });

    await logAudit("drop.created", "Drop", drop.id, req.user!.userId);

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.DROP_CREATED,
      data: { drop },
    });
  },
);

export const updateDrop = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const data = updateDropSchema.parse(req.body);

    const existingDrop = await prisma.drop.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!existingDrop) {
      throw new NotFoundError("Drop no encontrado");
    }

    if (data.slug && data.slug !== existingDrop.slug) {
      const slugExists = await prisma.drop.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        throw new AppError(400, ERROR_MESSAGES.SLUG_EXISTS);
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.config !== undefined) {
      updateData.config = data.config;
    }

    const drop = await prisma.drop.update({
      where: { id },
      data: updateData,
    });

    await logAudit("drop.updated", "Drop", drop.id, req.user!.userId, data);

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.DROP_UPDATED,
      data: { drop },
    });
  },
);

export const deleteDrop = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    const drop = await prisma.drop.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!drop) {
      throw new NotFoundError("Drop no encontrado");
    }

    await prisma.drop.delete({ where: { id } });

    await logAudit("drop.deleted", "Drop", id, req.user!.userId);

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.DROP_DELETED,
    });
  },
);

export const trackVisitor = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const dropId = req.body.dropId as string;
    const sessionId = req.query.sessionId as string | undefined;

    const drop = await prisma.drop.findUnique({ where: { id: dropId } });
    if (!drop) {
      throw new NotFoundError("Drop no encontrado");
    }

    const visitor = await prisma.visitor.create({
      data: {
        dropId: dropId,
        sessionId: sessionId || null,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        userId: req.user?.userId,
      },
    });

    res.status(201).json({
      success: true,
      data: { visitorId: visitor.id },
    });
  },
);
