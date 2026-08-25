import { Response } from 'express';
import { prisma } from '../config/database.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';
import { normalizeSellerSlugInput } from '../utils/sellerSlug.js';

export const getSellerBySlug = asyncHandler(async (req, res: Response) => {
  const sellerSlug = normalizeSellerSlugInput(req.params.slug as string);
  if (!sellerSlug) {
    throw new NotFoundError('Vendedor no encontrado');
  }

  const seller = await prisma.user.findFirst({
    where: { sellerSlug, role: 'INFLUENCER' },
    select: {
      id: true,
      sellerSlug: true,
      name: true,
      avatar: true,
    },
  });

  if (!seller) {
    throw new NotFoundError('Vendedor no encontrado');
  }

  res.json({
    success: true,
    data: { seller },
  });
});
