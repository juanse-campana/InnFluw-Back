import { prisma } from '../config/database.js';
import { normalizeSellerSlug } from '../utils/sellerSlug.js';

export { normalizeSellerSlug } from '../utils/sellerSlug.js';

export const createAvailableSellerSlug = async (name: string): Promise<string> => {
  const baseSlug = normalizeSellerSlug(name);

  for (let suffix = 1; ; suffix += 1) {
    const sellerSlug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const existingUser = await prisma.user.findUnique({
      where: { sellerSlug },
      select: { id: true },
    });

    if (!existingUser) return sellerSlug;
  }
};
