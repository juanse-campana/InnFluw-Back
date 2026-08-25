import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { normalizeSellerSlug } from '../src/utils/sellerSlug.js';

const prisma = new PrismaClient();

async function createAvailableSellerSlug(name: string): Promise<string> {
  const baseSlug = normalizeSellerSlug(name);

  for (let suffix = 1; ; suffix += 1) {
    const sellerSlug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const existingUser = await prisma.user.findUnique({
      where: { sellerSlug },
      select: { id: true },
    });

    if (!existingUser) return sellerSlug;
  }
}

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role: 'INFLUENCER', sellerSlug: null },
    select: { id: true, name: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  let updatedCount = 0;
  for (const user of users) {
    const sellerSlug = await createAvailableSellerSlug(user.name);
    const result = await prisma.user.updateMany({
      where: { id: user.id, role: 'INFLUENCER', sellerSlug: null },
      data: { sellerSlug },
    });
    updatedCount += result.count;
  }

  console.log(`Backfilled seller slugs: ${updatedCount}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seller slug backfill failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
