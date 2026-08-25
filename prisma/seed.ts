import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  DropStatus,
  DiscountType,
  OrderStatus,
} from '@prisma/client';
import { fakerES, fakerEN } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const fakerEs = fakerES;
const fakerEn = fakerEN;

const NOW = new Date();
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SIX_MONTHS_AGO = new Date(NOW.getTime() - 180 * DAY_MS);

const COUNTS = {
  USERS: 52,
  DROPS: 180,
  DISCOUNT_CODES: 70,
  ORDERS: 2500,
  VISITORS: 30000,
  WEBHOOKS: 40,
  WEBHOOK_DELIVERIES: 3000,
  AUDIT_LOGS: 4000,
  OTP_CODES: 150,
};

const CATEGORIES = [
  'fitness',
  'beauty',
  'gaming',
  'cursos',
  'moda',
  'musica',
  'hogar',
  'tech',
] as const;

const CURRENCIES = ['USD', 'EUR', 'ARS'] as const;
const TEMPLATES = ['minimal', 'standard', 'showcase'] as const;

const STATUS_WEIGHTS: Array<{ value: DropStatus; weight: number }> = [
  { value: DropStatus.LIVE, weight: 45 },
  { value: DropStatus.SOLD_OUT, weight: 18 },
  { value: DropStatus.ENDED, weight: 15 },
  { value: DropStatus.COMING_SOON, weight: 12 },
  { value: DropStatus.DRAFT, weight: 10 },
];

const ORDER_STATUS_WEIGHTS: Array<{
  value: OrderStatus;
  weight: number;
}> = [
  { value: OrderStatus.CONFIRMED, weight: 70 },
  { value: OrderStatus.PENDING, weight: 26 },
  { value: OrderStatus.REFUNDED, weight: 4 },
];

const DEMO_PASSWORD = 'Demo1234!';
const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
];

const IP_PREFIXES = ['190.45', '181.30', '201.250', '83.45', '152.170', '177.91', '200.50', '167.57'];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function weightedPick<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((acc, x) => acc + x.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1]!.value;
}

function dateBetween(start: Date, end: Date): Date {
  const s = start.getTime();
  const e = end.getTime();
  return new Date(s + Math.random() * (e - s));
}

function recentWeightedDate(): Date {
  const ageMs = NOW.getTime() - SIX_MONTHS_AGO.getTime();
  const r = Math.random();
  const biased = Math.pow(r, 1.7);
  return new Date(NOW.getTime() - biased * ageMs);
}

function slugifyBase(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60 * 1000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function wipe() {
  console.log('🧹 Wiping existing data...');
  await prisma.webhookDelivery.deleteMany();
  console.log('   - webhook_deliveries');
  await prisma.visitor.deleteMany();
  console.log('   - visitors');
  await prisma.order.deleteMany();
  console.log('   - orders');
  await prisma.discountCodeDrop.deleteMany();
  console.log('   - discount_code_drops');
  await prisma.webhook.deleteMany();
  console.log('   - webhooks');
  await prisma.discountCode.deleteMany();
  console.log('   - discount_codes');
  await prisma.auditLog.deleteMany();
  console.log('   - audit_logs');
  await prisma.otpCode.deleteMany();
  console.log('   - otp_codes');
  await prisma.drop.deleteMany();
  console.log('   - drops');
  await prisma.user.deleteMany();
  console.log('   - users');
}

function makeDropConfig(category: string): Record<string, unknown> {
  const palette = fakerEn.helpers.arrayElement([
    { primary: '#FF4D6D', secondary: '#FF8FA3', background: '#1A1A2E', text: '#FFFFFF', accent: '#FFC93C' },
    { primary: '#6C5CE7', secondary: '#A29BFE', background: '#0F0F1E', text: '#FFFFFF', accent: '#00D9FF' },
    { primary: '#00B894', secondary: '#55EFC4', background: '#FFFFFF', text: '#2D3436', accent: '#FDCB6E' },
    { primary: '#E17055', secondary: '#FAB1A0', background: '#FFF8F0', text: '#2D3436', accent: '#0984E3' },
    { primary: '#2D3436', secondary: '#636E72', background: '#FFFFFF', text: '#2D3436', accent: '#E17055' },
    { primary: '#0984E3', secondary: '#74B9FF', background: '#0A1929', text: '#FFFFFF', accent: '#FFD93D' },
  ]);
  const headlines: Record<string, string[]> = {
    fitness: ['Transformá tu cuerpo', 'Rutina premium', 'Entrená con los mejores'],
    beauty: ['Glow natural', 'Tu rutina perfecta', 'Belleza real'],
    gaming: ['Setup nivel pro', 'Jugá como un pro', 'Edición limitada'],
    cursos: ['Aprendé a tu ritmo', 'Curso premium', 'Masterclass exclusiva'],
    moda: ['Drop exclusivo', 'Edición limitada', 'Colección cápsula'],
    musica: ['Sonido profesional', 'Beats exclusivos', 'Lanzamiento especial'],
    hogar: ['Tu espacio ideal', 'Hogar con estilo', 'Diseño único'],
    tech: ['Tecnología premium', 'Innovación en tus manos', 'Gadget exclusivo'],
  };
  const headlineList = headlines[category] ?? headlines.tech!;
  return {
    theme: {
      colors: palette,
    },
    layout: {
      template: pick(TEMPLATES),
    },
    products: {
      showStock: Math.random() > 0.2,
      showPrices: Math.random() > 0.1,
      currency: pick(CURRENCIES),
    },
    content: {
      headline: pick(headlineList),
      subheadline: fakerEs.commerce.productAdjective() + ' · ' + fakerEs.commerce.product(),
      ctaText: fakerEn.helpers.arrayElement(['Comprar ahora', 'Conseguir el mío', 'Reservar ya', 'Quiero el mío']),
    },
  };
}

async function seedUsers(): Promise<Array<{ id: string; role: UserRole; email: string; name: string; createdAt: Date; isDemo: boolean }>> {
  console.log(`👥 Seeding ${COUNTS.USERS} users...`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const fixed: Array<{ email: string; name: string; role: UserRole; emailVerified: boolean; verifiedToken: boolean }> = [
    {
      email: 'admin@demo.io',
      name: 'Admin Demo',
      role: UserRole.ADMIN,
      emailVerified: true,
      verifiedToken: false,
    },
    {
      email: 'influencer@demo.io',
      name: 'Influencer Demo',
      role: UserRole.INFLUENCER,
      emailVerified: true,
      verifiedToken: false,
    },
    {
      email: 'laura.fit@demo.io',
      name: 'Laura Fit',
      role: UserRole.INFLUENCER,
      emailVerified: true,
      verifiedToken: false,
    },
  ];

  const demoUsers = fixed.map((u) => ({
    id: uuidv4(),
    email: u.email,
    password: passwordHash,
    name: u.name,
    avatar: `https://i.pravatar.cc/300?u=${encodeURIComponent(u.email)}`,
    role: u.role,
    emailVerified: u.emailVerified,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    createdAt: dateBetween(new Date(NOW.getTime() - 200 * DAY_MS), new Date(NOW.getTime() - 60 * DAY_MS)),
    updatedAt: NOW,
  }));

  const remaining = COUNTS.USERS - demoUsers.length;
  const adminCount = 2 - demoUsers.filter((u) => u.role === UserRole.ADMIN).length;
  const influencerRemaining = remaining - adminCount;

  const generated: typeof demoUsers = [];
  for (let i = 0; i < remaining; i++) {
    const isAdmin = i < adminCount;
    const verified = Math.random() > 0.1;
    const createdAt = dateBetween(new Date(NOW.getTime() - 200 * DAY_MS), new Date(NOW.getTime() - 1 * DAY_MS));
    const firstName = fakerEs.person.firstName();
    const lastName = fakerEs.person.lastName();
    const name = `${firstName} ${lastName}`;
    const emailLocal = `${firstName}.${lastName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]/g, '')
      .slice(0, 30);
    const email = `${emailLocal}.${i}@${fakerEn.internet.domainName()}`;
    generated.push({
      id: uuidv4(),
      email,
      password: passwordHash,
      name,
      avatar: `https://i.pravatar.cc/300?u=${encodeURIComponent(email)}`,
      role: isAdmin ? UserRole.ADMIN : UserRole.INFLUENCER,
      emailVerified: verified,
      emailVerificationToken: verified ? null : uuidv4(),
      emailVerificationExpires: verified
        ? null
        : new Date(createdAt.getTime() + 24 * HOUR_MS),
      createdAt,
      updatedAt: NOW,
    });
  }

  const all = [...demoUsers, ...generated];
  await prisma.user.createMany({ data: all });

  const result = all.map((u) => ({
    id: u.id,
    role: u.role,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    isDemo: demoUsers.includes(u),
  }));
  console.log(`   ✓ ${all.length} users (${all.filter((u) => u.role === UserRole.ADMIN).length} ADMIN, ${all.filter((u) => u.role === UserRole.INFLUENCER).length} INFLUENCER)`);
  return result;
}

interface PlannedDrop {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  initialStock: number;
  finalStock: number;
  productImage: string | null;
  isActive: boolean;
  status: DropStatus;
  config: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

async function seedDrops(users: Array<{ id: string; createdAt: Date; isDemo: boolean }>): Promise<PlannedDrop[]> {
  console.log(`📦 Seeding ${COUNTS.DROPS} drops...`);
  const influencers = users.filter((u) => u.role === UserRole.INFLUENCER);

  const laura = users.find((u) => u.email === 'laura.fit@demo.io');
  const influencer = users.find((u) => u.email === 'influencer@demo.io');

  const dropsPerInfluencer = new Map<string, number>();
  const activeCount = Math.min(influencers.length, Math.ceil(COUNTS.DROPS / 5));
  const active = influencers.slice(0, activeCount);
  for (const u of active) {
    dropsPerInfluencer.set(u.id, randInt(2, 6));
  }
  if (laura) dropsPerInfluencer.set(laura.id, 14);
  if (influencer) dropsPerInfluencer.set(influencer.id, 6);

  const slugCounter = new Map<string, number>();
  const planned: PlannedDrop[] = [];

  const dropsToAssign: Array<{ user: typeof influencers[number]; count: number }> = [];
  for (const u of active) {
    const c = dropsPerInfluencer.get(u.id) ?? 0;
    if (c > 0) dropsToAssign.push({ user: u, count: c });
  }
  if (laura && !dropsToAssign.find((d) => d.user.id === laura.id)) {
    dropsToAssign.push({ user: laura, count: dropsPerInfluencer.get(laura.id) ?? 0 });
  }

  let totalNeeded = COUNTS.DROPS;
  let safety = 0;
  while (totalNeeded > 0 && safety < 100) {
    safety++;
    for (const da of dropsToAssign) {
      if (totalNeeded <= 0) break;
      const remaining = dropsPerInfluencer.get(da.user.id) ?? 0;
      if (remaining <= 0) continue;
      const take = Math.min(remaining, totalNeeded);
      dropsPerInfluencer.set(da.user.id, remaining - take);
      totalNeeded -= take;

      for (let i = 0; i < take; i++) {
        const status = weightedPick(STATUS_WEIGHTS);
        const category = pick(CATEGORIES);
        const titleAdj = fakerEs.commerce.productAdjective();
        const titleNoun = fakerEs.commerce.product();
        const title = `${titleAdj} ${titleNoun}`;
        const baseSlug = slugifyBase(title) || `drop-${i}`;
        const counter = (slugCounter.get(baseSlug) ?? 0) + 1;
        slugCounter.set(baseSlug, counter);
        const slug = counter === 1 ? baseSlug : `${baseSlug}-${counter}`;

        let initialStock: number;
        if (status === DropStatus.SOLD_OUT) {
          initialStock = randInt(8, 60);
        } else if (status === DropStatus.LIVE) {
          initialStock = randInt(20, 150);
        } else if (status === DropStatus.COMING_SOON) {
          initialStock = randInt(15, 200);
        } else if (status === DropStatus.DRAFT) {
          initialStock = randInt(10, 80);
        } else {
          initialStock = randInt(15, 120);
        }

        const price = round2(randInt(1500, 80000) / 100);
        const createdAt = dateBetween(
          new Date(da.user.createdAt.getTime() + 1 * DAY_MS),
          new Date(NOW.getTime() - 1 * DAY_MS),
        );
        const withConfig = Math.random() < 0.5;

        planned.push({
          id: uuidv4(),
          userId: da.user.id,
          title,
          slug,
          description: fakerEs.commerce.productDescription(),
          category,
          price,
          initialStock,
          finalStock: initialStock,
          productImage: `https://picsum.photos/seed/${encodeURIComponent(slug)}/800/800`,
          isActive: status !== DropStatus.DRAFT ? true : Math.random() > 0.3,
          status,
          config: withConfig ? makeDropConfig(category) : null,
          createdAt,
          updatedAt: NOW,
        });
      }
    }
  }

  while (planned.length < COUNTS.DROPS && safety < 1000) {
    safety++;
    const u = pick(influencers);
    const status = weightedPick(STATUS_WEIGHTS);
    const category = pick(CATEGORIES);
    const titleAdj = fakerEs.commerce.productAdjective();
    const titleNoun = fakerEs.commerce.product();
    const title = `${titleAdj} ${titleNoun}`;
    const baseSlug = slugifyBase(title) || `drop-${planned.length}`;
    const counter = (slugCounter.get(baseSlug) ?? 0) + 1;
    slugCounter.set(baseSlug, counter);
    const slug = counter === 1 ? baseSlug : `${baseSlug}-${counter}`;
    let initialStock = 30;
    if (status === DropStatus.SOLD_OUT) initialStock = randInt(8, 60);
    else if (status === DropStatus.LIVE) initialStock = randInt(20, 150);
    else if (status === DropStatus.COMING_SOON) initialStock = randInt(15, 200);
    else if (status === DropStatus.DRAFT) initialStock = randInt(10, 80);
    else initialStock = randInt(15, 120);

    const price = round2(randInt(1500, 80000) / 100);
    const createdAt = dateBetween(
      new Date(u.createdAt.getTime() + 1 * DAY_MS),
      new Date(NOW.getTime() - 1 * DAY_MS),
    );
    planned.push({
      id: uuidv4(),
      userId: u.id,
      title,
      slug,
      description: fakerEs.commerce.productDescription(),
      category,
      price,
      initialStock,
      finalStock: initialStock,
      productImage: `https://picsum.photos/seed/${encodeURIComponent(slug)}/800/800`,
      isActive: status !== DropStatus.DRAFT ? true : Math.random() > 0.3,
      status,
      config: Math.random() < 0.5 ? makeDropConfig(category) : null,
      createdAt,
      updatedAt: NOW,
    });
  }

  await prisma.drop.createMany({
    data: planned.map((d) => ({
      id: d.id,
      userId: d.userId,
      title: d.title,
      slug: d.slug,
      description: d.description,
      category: d.category,
      price: d.price,
      stock: d.finalStock,
      productImage: d.productImage,
      isActive: d.isActive,
      status: d.status,
      config: d.config as any,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  });

  console.log(
    `   ✓ ${planned.length} drops across ${dropsToAssign.length} users (laura.fit has ${planned.filter((d) => d.userId === laura?.id).length})`,
  );
  return planned;
}

async function seedDiscountCodes(
  users: Array<{ id: string; createdAt: Date }>,
  drops: PlannedDrop[],
): Promise<Array<{ id: string; userId: string; type: DiscountType; value: number; maxUses: number | null; expiresAt: Date | null; isActive: boolean; dropIds: string[]; createdAt: Date }>> {
  console.log(`🏷️  Seeding ${COUNTS.DISCOUNT_CODES} discount codes...`);
  const codeCounter = new Map<string, number>();

  const dropsByUser = new Map<string, PlannedDrop[]>();
  for (const d of drops) {
    const arr = dropsByUser.get(d.userId) ?? [];
    arr.push(d);
    dropsByUser.set(d.userId, arr);
  }

  const codeTypes = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;

  const planned: Array<{ id: string; code: string; userId: string; type: DiscountType; value: number; maxUses: number | null; expiresAt: Date | null; isActive: boolean; dropIds: string[]; createdAt: Date }> = [];

  for (let i = 0; i < COUNTS.DISCOUNT_CODES; i++) {
    const userCandidates = users.filter((u) => (dropsByUser.get(u.id)?.length ?? 0) > 0);
    const u = pick(userCandidates);
    const userDrops = dropsByUser.get(u.id)!;
    const dropIds = Array.from(
      new Set(
        Array.from({ length: randInt(1, 3) }, () => pick(userDrops).id),
      ),
    );
    const type = pick(codeTypes);
    const value = type === DiscountType.PERCENTAGE ? randInt(5, 35) : round2(randInt(500, 5000) / 100);
    const createdAt = dateBetween(new Date(u.createdAt.getTime() + 5 * DAY_MS), new Date(NOW.getTime() - 1 * DAY_MS));

    let expiresAt: Date | null = null;
    let maxUses: number | null = null;
    let isActive = true;

    const variant = Math.random();
    if (variant < 0.25) {
      expiresAt = new Date(createdAt.getTime() - randInt(1, 60) * DAY_MS);
      isActive = false;
    } else if (variant < 0.5) {
      maxUses = randInt(3, 30);
      isActive = Math.random() > 0.3;
    } else if (variant < 0.7) {
      expiresAt = new Date(createdAt.getTime() + randInt(30, 120) * DAY_MS);
    } else {
      expiresAt = new Date(createdAt.getTime() + randInt(60, 180) * DAY_MS);
    }
    if (Math.random() < 0.1) isActive = false;

    let base = fakerEs.lorem.word({ length: { min: 4, max: 8 } }).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!base) base = 'CODE';
    const counter = (codeCounter.get(base) ?? 0) + 1;
    codeCounter.set(base, counter);
    const code = counter === 1 ? base : `${base}${counter}`;

    planned.push({
      id: uuidv4(),
      code,
      userId: u.id,
      type,
      value,
      maxUses,
      expiresAt,
      isActive,
      dropIds,
      createdAt,
    });
  }

  await prisma.discountCode.createMany({
    data: planned.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      minAmount: c.type === DiscountType.PERCENTAGE ? null : round2(randInt(2000, 10000) / 100),
      maxUses: c.maxUses,
      uses: 0,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: NOW,
      userId: c.userId,
    })),
  });

  const pivots = planned.flatMap((c) =>
    c.dropIds.map((dropId) => ({ discountCodeId: c.id, dropId })),
  );
  await prisma.discountCodeDrop.createMany({ data: pivots });

  console.log(`   ✓ ${planned.length} codes, ${pivots.length} pivot rows`);
  return planned;
}

async function seedWebhooks(users: Array<{ id: string }>) {
  console.log(`🔔 Seeding ${COUNTS.WEBHOOKS} webhooks...`);
  const candidates = users.filter((u) => u.role !== undefined);
  const planned = [];
  for (let i = 0; i < COUNTS.WEBHOOKS; i++) {
    const u = pick(candidates);
    const events = fakerEn.helpers.arrayElements(
      ['order.created', 'order.confirmed', 'drop.stock.low'],
      { min: 1, max: 3 },
    );
    const slug = fakerEn.lorem.slug(2).toLowerCase().replace(/[^a-z0-9-]/g, '');
    planned.push({
      id: uuidv4(),
      url: `https://hooks.${fakerEn.internet.domainName()}/${slug}-${i}`,
      events: Array.from(new Set(events)),
      isActive: Math.random() > 0.15,
      createdAt: dateBetween(SIX_MONTHS_AGO, new Date(NOW.getTime() - 7 * DAY_MS)),
      updatedAt: NOW,
      userId: u.id,
    });
  }
  await prisma.webhook.createMany({ data: planned });
  console.log(`   ✓ ${planned.length} webhooks`);
  return planned;
}

interface PlannedOrder {
  id: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string | null;
  buyerAddress: string | null;
  buyerCity: string | null;
  buyerCountry: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  confirmationToken: string;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  dropId: string;
  discountCodeId: string | null;
  userId: string;
}

interface DropOrderPlan {
  drop: PlannedDrop;
  orders: PlannedOrder[];
  totalOrders: number;
}

async function seedOrders(
  drops: PlannedDrop[],
  discountCodes: Array<{ id: string; userId: string; type: DiscountType; value: number; maxUses: number | null; expiresAt: Date | null; isActive: boolean; dropIds: string[]; createdAt: Date }>,
): Promise<{ orders: PlannedOrder[]; codesUses: Map<string, number>; perDrop: Map<string, number> }> {
  console.log(`🛒 Seeding ~${COUNTS.ORDERS} orders across drops...`);

  const eligibleDrops = drops.filter((d) =>
    d.status === DropStatus.LIVE ||
    d.status === DropStatus.SOLD_OUT ||
    d.status === DropStatus.ENDED,
  );

  const totalStockEligible = eligibleDrops.reduce((acc, d) => acc + d.initialStock, 0);

  const orderBudget = COUNTS.ORDERS;
  const dropOrderCounts = new Map<string, number>();
  const soldOutDrops = eligibleDrops.filter((d) => d.status === DropStatus.SOLD_OUT);
  const liveDrops = eligibleDrops.filter((d) => d.status !== DropStatus.SOLD_OUT);
  const soldOutTotalStock = soldOutDrops.reduce((acc, d) => acc + d.initialStock, 0);
  const liveTotalStock = liveDrops.reduce((acc, d) => acc + d.initialStock, 0);

  const soldOutRequired = soldOutTotalStock;
  const liveBudget = Math.max(0, orderBudget - soldOutRequired);
  const liveTargetScale = liveBudget / Math.max(1, liveTotalStock);

  let assigned = 0;
  for (const d of soldOutDrops) {
    dropOrderCounts.set(d.id, d.initialStock);
    assigned += d.initialStock;
  }
  for (const d of liveDrops) {
    const target = Math.max(1, Math.floor(d.initialStock * liveTargetScale * (0.7 + Math.random() * 0.6)));
    const cap = d.initialStock;
    const c = Math.min(target, cap);
    dropOrderCounts.set(d.id, c);
    assigned += c;
  }
  while (assigned < orderBudget && liveDrops.length > 0) {
    const d = pick(liveDrops);
    const cur = dropOrderCounts.get(d.id) ?? 0;
    if (cur < d.initialStock) {
      dropOrderCounts.set(d.id, cur + 1);
      assigned++;
    } else {
      const full = liveDrops.every((dd) => (dropOrderCounts.get(dd.id) ?? 0) >= dd.initialStock);
      if (full) break;
    }
  }
  while (assigned < orderBudget && eligibleDrops.length > 0) {
    const d = pick(eligibleDrops);
    const cur = dropOrderCounts.get(d.id) ?? 0;
    if (cur < d.initialStock) {
      dropOrderCounts.set(d.id, cur + 1);
      assigned++;
    } else {
      const full = eligibleDrops.every((dd) => (dropOrderCounts.get(dd.id) ?? 0) >= dd.initialStock);
      if (full) break;
    }
  }

  const validCodesByDrop = new Map<string, typeof discountCodes>();
  for (const c of discountCodes) {
    if (!c.isActive) continue;
    if (c.expiresAt && c.expiresAt < NOW) continue;
    for (const dropId of c.dropIds) {
      const arr = validCodesByDrop.get(dropId) ?? [];
      arr.push(c);
      validCodesByDrop.set(dropId, arr);
    }
  }

  const codesUses = new Map<string, number>();
  const perDrop = new Map<string, number>();

  const orders: PlannedOrder[] = [];

  for (const drop of eligibleDrops) {
    const n = dropOrderCounts.get(drop.id) ?? 0;
    if (n === 0) continue;
    perDrop.set(drop.id, n);

    const dropCreatedAt = drop.createdAt.getTime();
    const dropEndWindow =
      drop.status === DropStatus.ENDED
        ? Math.min(NOW.getTime(), dropCreatedAt + 60 * DAY_MS)
        : NOW.getTime();
    const earliest = dropCreatedAt + 5 * 60 * 1000;
    if (earliest > dropEndWindow) continue;

    const codesForDrop = validCodesByDrop.get(drop.id) ?? [];
    const codeUsageRemaining = new Map<string, number>();
    for (const c of codesForDrop) {
      if (c.maxUses != null) {
        codeUsageRemaining.set(c.id, c.maxUses);
      }
    }

    for (let i = 0; i < n; i++) {
      const orderStatus = weightedPick(ORDER_STATUS_WEIGHTS);
      const ageMs = dropEndWindow - earliest;
      const r = Math.random();
      const biased = Math.pow(r, 1.7);
      const createdAt = new Date(earliest + biased * ageMs);

      let subtotal = drop.price;
      let discount = 0;
      let codeId: string | null = null;

      const canApplyCode = codesForDrop.length > 0 && orderStatus !== OrderStatus.REFUNDED && createdAt >= codesForDrop[0]!.createdAt.getTime();
      if (canApplyCode && Math.random() < 0.18) {
        let candidate: typeof codesForDrop[number] | null = null;
        const attempts = 3;
        for (let a = 0; a < attempts; a++) {
          const c = pick(codesForDrop);
          if (c.expiresAt && c.expiresAt < createdAt) continue;
          if (c.maxUses != null) {
            const left = codeUsageRemaining.get(c.id) ?? 0;
            if (left <= 0) continue;
          }
          candidate = c;
          break;
        }
        if (candidate) {
          const c = candidate;
          if (c.type === DiscountType.PERCENTAGE) {
            discount = round2((subtotal * c.value) / 100);
          } else {
            discount = round2(Math.min(c.value, subtotal));
          }
          discount = round2(discount);
          subtotal = round2(subtotal);
          const total = round2(Math.max(0, subtotal - discount));
          codeId = c.id;
          codesUses.set(c.id, (codesUses.get(c.id) ?? 0) + 1);
          if (c.maxUses != null) {
            codeUsageRemaining.set(c.id, (codeUsageRemaining.get(c.id) ?? 0) - 1);
          }
          const updatedAt = addMinutes(createdAt, randInt(1, 30));
          let confirmedAt: Date | null = null;
          if (orderStatus === OrderStatus.CONFIRMED) {
            confirmedAt = addMinutes(createdAt, randInt(2, 60 * 8));
          }
          const buyerName = `${fakerEs.person.firstName()} ${fakerEs.person.lastName()}`;
          const buyerEmail = fakerEs.internet.email({ firstName: buyerName.split(' ')[0], lastName: buyerName.split(' ')[1] }).toLowerCase();
          orders.push({
            id: uuidv4(),
            buyerEmail,
            buyerName,
            buyerPhone: fakerEs.phone.number(),
            buyerAddress: fakerEs.location.streetAddress(),
            buyerCity: pick(['Buenos Aires', 'Madrid', 'Ciudad de México', 'Bogotá', 'Lima', 'Santiago', 'Barcelona', 'Rosario', 'Córdoba', 'Montevideo', 'Guadalajara', 'Valencia', 'Sevilla', 'Medellín']),
            buyerCountry: pick(['Argentina', 'España', 'México', 'Colombia', 'Perú', 'Chile', 'Uruguay']),
            subtotal,
            discount,
            total,
            status: orderStatus,
            confirmationToken: uuidv4(),
            confirmedAt,
            createdAt,
            updatedAt,
            dropId: drop.id,
            discountCodeId: codeId,
            userId: drop.userId,
          });
          continue;
        }
      }

      subtotal = round2(subtotal);
      const total = subtotal;
      const updatedAt = addMinutes(createdAt, randInt(1, 30));
      let confirmedAt: Date | null = null;
      if (orderStatus === OrderStatus.CONFIRMED) {
        confirmedAt = addMinutes(createdAt, randInt(2, 60 * 8));
      }
      const buyerName = `${fakerEs.person.firstName()} ${fakerEs.person.lastName()}`;
      const buyerEmail = fakerEs.internet.email({ firstName: buyerName.split(' ')[0], lastName: buyerName.split(' ')[1] }).toLowerCase();
      orders.push({
        id: uuidv4(),
        buyerEmail,
        buyerName,
        buyerPhone: fakerEs.phone.number(),
        buyerAddress: fakerEs.location.streetAddress(),
        buyerCity: pick(['Buenos Aires', 'Madrid', 'Ciudad de México', 'Bogotá', 'Lima', 'Santiago', 'Barcelona', 'Rosario', 'Córdoba', 'Montevideo', 'Guadalajara', 'Valencia', 'Sevilla', 'Medellín']),
        buyerCountry: pick(['Argentina', 'España', 'México', 'Colombia', 'Perú', 'Chile', 'Uruguay']),
        subtotal,
        discount,
        total,
        status: orderStatus,
        confirmationToken: uuidv4(),
        confirmedAt,
        createdAt,
        updatedAt,
        dropId: drop.id,
        discountCodeId: null,
        userId: drop.userId,
      });
    }
  }

  for (const drop of drops) {
    const count = perDrop.get(drop.id) ?? 0;
    drop.finalStock = Math.max(0, drop.initialStock - count);
  }

  await prisma.order.createMany({ data: orders });

  const statusCounts: Record<string, number> = {};
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  console.log(`   ✓ ${orders.length} orders (${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(', ')})`);
  return { orders, codesUses, perDrop };
}

async function updateDropStocks(drops: PlannedDrop[]) {
  console.log('🔧 Updating drop stock to actual values...');
  for (const drop of drops) {
    await prisma.drop.update({
      where: { id: drop.id },
      data: { stock: drop.finalStock },
    });
  }
  console.log(`   ✓ ${drops.length} drops updated`);
}

async function updateDiscountCodeUses(codesUses: Map<string, number>) {
  console.log('🔧 Updating discount code use counts...');
  let i = 0;
  for (const [codeId, uses] of codesUses.entries()) {
    await prisma.discountCode.update({
      where: { id: codeId },
      data: { uses },
    });
    i++;
  }
  console.log(`   ✓ ${i} codes updated`);
}

async function seedVisitors(drops: PlannedDrop[], users: Array<{ id: string }>) {
  console.log(`👣 Seeding ${COUNTS.VISITORS} visitors...`);
  const eligibleDrops = drops.filter((d) => d.status !== DropStatus.DRAFT);
  const totalEligibleStock = eligibleDrops.reduce((acc, d) => d.initialStock, 0);

  const allocations = new Map<string, number>();
  let total = 0;
  for (const d of eligibleDrops) {
    const share = Math.max(5, Math.floor((d.initialStock / totalEligibleStock) * COUNTS.VISITORS * (0.5 + Math.random())));
    allocations.set(d.id, share);
    total += share;
  }
  while (total > COUNTS.VISITORS && eligibleDrops.length > 0) {
    const d = pick(eligibleDrops);
    const cur = allocations.get(d.id) ?? 0;
    if (cur > 5) {
      allocations.set(d.id, cur - 1);
      total--;
    }
  }
  while (total < COUNTS.VISITORS && eligibleDrops.length > 0) {
    const d = pick(eligibleDrops);
    allocations.set(d.id, (allocations.get(d.id) ?? 0) + 1);
    total++;
  }

  const BATCH = 2000;
  let inserted = 0;
  const userIdsForVisitors = users.map((u) => u.id);

  for (const drop of eligibleDrops) {
    const count = allocations.get(drop.id) ?? 0;
    if (count === 0) continue;
    const dropCreatedAt = drop.createdAt.getTime();
    const endWindow =
      drop.status === DropStatus.ENDED
        ? Math.min(NOW.getTime(), dropCreatedAt + 60 * DAY_MS)
        : NOW.getTime();
    const window = endWindow - dropCreatedAt;

    const rows = [];
    for (let i = 0; i < count; i++) {
      const biased = Math.pow(Math.random(), 1.7);
      const createdAt = new Date(dropCreatedAt + biased * window);
      const withUser = Math.random() > 0.9;
      rows.push({
        id: uuidv4(),
        sessionId: `sess-${fakerEn.string.alphanumeric(24)}`,
        ip: `${pick(IP_PREFIXES)}.${randInt(0, 255)}.${randInt(0, 255)}`,
        userAgent: pick(USER_AGENTS),
        createdAt,
        dropId: drop.id,
        userId: withUser ? pick(userIdsForVisitors) : null,
      });
      if (rows.length >= BATCH) {
        await prisma.visitor.createMany({ data: rows });
        inserted += rows.length;
        rows.length = 0;
      }
    }
    if (rows.length > 0) {
      await prisma.visitor.createMany({ data: rows });
      inserted += rows.length;
    }
  }
  console.log(`   ✓ ${inserted} visitors`);
}

async function seedWebhookDeliveries(webhooks: Array<{ id: string; events: string[]; userId: string }>, orders: PlannedOrder[]) {
  console.log(`📬 Seeding ~${COUNTS.WEBHOOK_DELIVERIES} webhook deliveries...`);
  const ordersByUser = new Map<string, PlannedOrder[]>();
  for (const o of orders) {
    const arr = ordersByUser.get(o.userId) ?? [];
    arr.push(o);
    ordersByUser.set(o.userId, arr);
  }

  const deliveries: Array<{
    id: string;
    status: string;
    statusCode: number | null;
    response: string | null;
    error: string | null;
    createdAt: Date;
    webhookId: string;
    dropId: string | null;
    orderId: string | null;
  }> = [];

  for (const wh of webhooks) {
    const eligibleEvents = wh.events;
    const userOrders = ordersByUser.get(wh.userId) ?? [];
    const targetCount = Math.max(10, Math.floor((userOrders.length / Math.max(1, orders.length)) * COUNTS.WEBHOOK_DELIVERIES));
    const sample = userOrders.slice(0);
    for (let i = sample.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sample[i], sample[j]] = [sample[j]!, sample[i]!];
    }
    const chosen = sample.slice(0, Math.min(targetCount, sample.length));
    for (const o of chosen) {
      const event = pick(eligibleEvents);
      const isSuccess = Math.random() > 0.18;
      deliveries.push({
        id: uuidv4(),
        status: isSuccess ? 'success' : 'failed',
        statusCode: isSuccess ? 200 : pick([500, 502, 503, 504, 408, 429]),
        response: isSuccess ? '{"received":true,"event":"' + event + '"}' : null,
        error: isSuccess ? null : pick(['ECONNREFUSED', 'timeout after 30000ms', 'SSL handshake failed', 'Invalid response from server']),
        createdAt: new Date(o.createdAt.getTime() + randInt(0, 5) * 60 * 1000),
        webhookId: wh.id,
        dropId: o.dropId,
        orderId: o.id,
      });
      if (deliveries.length >= COUNTS.WEBHOOK_DELIVERIES) break;
    }
    if (deliveries.length >= COUNTS.WEBHOOK_DELIVERIES) break;
  }

  while (deliveries.length < COUNTS.WEBHOOK_DELIVERIES && orders.length > 0) {
    const o = pick(orders);
    const wh = webhooks.find((w) => w.userId === o.userId && w.events.length > 0);
    if (!wh) continue;
    const event = pick(wh.events);
    const isSuccess = Math.random() > 0.18;
    deliveries.push({
      id: uuidv4(),
      status: isSuccess ? 'success' : 'failed',
      statusCode: isSuccess ? 200 : pick([500, 502, 503, 504, 408, 429]),
      response: isSuccess ? '{"received":true,"event":"' + event + '"}' : null,
      error: isSuccess ? null : pick(['ECONNREFUSED', 'timeout after 30000ms', 'SSL handshake failed']),
      createdAt: new Date(o.createdAt.getTime() + randInt(0, 5) * 60 * 1000),
      webhookId: wh.id,
      dropId: o.dropId,
      orderId: o.id,
    });
  }

  const BATCH = 1000;
  for (let i = 0; i < deliveries.length; i += BATCH) {
    await prisma.webhookDelivery.createMany({ data: deliveries.slice(i, i + BATCH) });
  }
  console.log(`   ✓ ${deliveries.length} deliveries`);
}

async function seedOtpCodes(users: Array<{ id: string; createdAt: Date }>) {
  console.log(`🔐 Seeding ${COUNTS.OTP_CODES} otp codes...`);
  const rows = [];
  for (let i = 0; i < COUNTS.OTP_CODES; i++) {
    const u = pick(users);
    const createdAt = dateBetween(new Date(u.createdAt.getTime() + 1 * DAY_MS), new Date(NOW.getTime() - 1 * DAY_MS));
    const used = Math.random() > 0.15;
    rows.push({
      id: uuidv4(),
      email: fakerEs.internet.email().toLowerCase(),
      code: fakerEn.string.numeric(6),
      expiresAt: new Date(createdAt.getTime() + 5 * 60 * 1000),
      used,
      createdAt,
      userId: used ? u.id : null,
    });
  }
  await prisma.otpCode.createMany({ data: rows });
  console.log(`   ✓ ${rows.length} otp codes`);
}

async function seedAuditLogs(
  users: Array<{ id: string; createdAt: Date }>,
  drops: PlannedDrop[],
  discountCodes: Array<{ id: string; userId: string; createdAt: Date }>,
  orders: PlannedOrder[],
) {
  console.log(`📝 Seeding ~${COUNTS.AUDIT_LOGS} audit logs...`);
  const logs: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string;
    changes: any;
    metadata: any;
    createdAt: Date;
    userId: string | null;
  }> = [];

  const usedUserIds = new Set(users.map((u) => u.id));
  const userById = new Map(users.map((u) => [u.id, u]));

  for (const u of users) {
    logs.push({
      id: uuidv4(),
      action: 'user.created',
      entity: 'User',
      entityId: u.id,
      changes: null,
      metadata: { email: u.email, name: (userById.get(u.id) as any)?.name ?? null },
      createdAt: u.createdAt,
      userId: u.id,
    });

    const loginCount = randInt(1, 6);
    for (let i = 0; i < loginCount; i++) {
      const t = new Date(u.createdAt.getTime() + randInt(1, 180) * DAY_MS);
      logs.push({
        id: uuidv4(),
        action: 'user.login',
        entity: 'User',
        entityId: u.id,
        changes: null,
        metadata: { ip: `${pick(IP_PREFIXES)}.${randInt(0, 255)}.${randInt(0, 255)}` },
        createdAt: t,
        userId: u.id,
      });
    }
  }

  for (const d of drops) {
    logs.push({
      id: uuidv4(),
      action: 'drop.created',
      entity: 'Drop',
      entityId: d.id,
      changes: null,
      metadata: { title: d.title, category: d.category, price: d.price },
      createdAt: d.createdAt,
      userId: d.userId,
    });
    if (Math.random() < 0.5) {
      logs.push({
        id: uuidv4(),
        action: 'drop.updated',
        entity: 'Drop',
        entityId: d.id,
        changes: { fields: { status: { from: 'LIVE', to: d.status } } },
        metadata: null,
        createdAt: new Date(d.createdAt.getTime() + randInt(1, 30) * DAY_MS),
        userId: d.userId,
      });
    }
  }

  for (const c of discountCodes) {
    if (!usedUserIds.has(c.userId)) continue;
    logs.push({
      id: uuidv4(),
      action: 'discountCode.created',
      entity: 'DiscountCode',
      entityId: c.id,
      changes: null,
      metadata: { code: c.id.slice(0, 8), type: (c as any).type ?? 'PERCENTAGE' },
      createdAt: c.createdAt,
      userId: c.userId,
    });
  }

  for (const o of orders.slice(0, Math.min(orders.length, COUNTS.AUDIT_LOGS / 2))) {
    logs.push({
      id: uuidv4(),
      action: 'order.created',
      entity: 'Order',
      entityId: o.id,
      changes: null,
      metadata: { dropId: o.dropId, buyerEmail: o.buyerEmail, total: o.total },
      createdAt: o.createdAt,
      userId: null,
    });
    if (o.status === OrderStatus.CONFIRMED && o.confirmedAt) {
      logs.push({
        id: uuidv4(),
        action: 'order.confirmed',
        entity: 'Order',
        entityId: o.id,
        changes: null,
        metadata: { previousStatus: 'PENDING', newStatus: 'CONFIRMED' },
        createdAt: o.confirmedAt,
        userId: null,
      });
    }
  }

  if (logs.length > COUNTS.AUDIT_LOGS) logs.length = COUNTS.AUDIT_LOGS;
  while (logs.length < COUNTS.AUDIT_LOGS && orders.length > 0) {
    const o = pick(orders);
    logs.push({
      id: uuidv4(),
      action: 'order.created',
      entity: 'Order',
      entityId: o.id,
      changes: null,
      metadata: { dropId: o.dropId, buyerEmail: o.buyerEmail, total: o.total },
      createdAt: o.createdAt,
      userId: null,
    });
  }

  const BATCH = 1000;
  for (let i = 0; i < logs.length; i += BATCH) {
    await prisma.auditLog.createMany({ data: logs.slice(i, i + BATCH) });
  }
  console.log(`   ✓ ${logs.length} audit logs`);
}

async function verify(users: Array<{ id: string; email: string }>) {
  console.log('\n🔎 Verification:');
  const counts = await prisma.$transaction([
    prisma.user.count(),
    prisma.drop.count(),
    prisma.discountCode.count(),
    prisma.discountCodeDrop.count(),
    prisma.order.count(),
    prisma.visitor.count(),
    prisma.webhook.count(),
    prisma.webhookDelivery.count(),
    prisma.otpCode.count(),
    prisma.auditLog.count(),
  ]);
  console.log('   Counts per table:');
  console.log(`     users: ${counts[0]}`);
  console.log(`     drops: ${counts[1]}`);
  console.log(`     discount_codes: ${counts[2]}`);
  console.log(`     discount_code_drops: ${counts[3]}`);
  console.log(`     orders: ${counts[4]}`);
  console.log(`     visitors: ${counts[5]}`);
  console.log(`     webhooks: ${counts[6]}`);
  console.log(`     webhook_deliveries: ${counts[7]}`);
  console.log(`     otp_codes: ${counts[8]}`);
  console.log(`     audit_logs: ${counts[9]}`);

  const soldOut = await prisma.drop.findMany({
    where: { status: DropStatus.SOLD_OUT },
    select: { id: true, stock: true },
    take: 5,
  });
  const allSoldOutZero = soldOut.every((d) => d.stock === 0);
  console.log(`   SOLD_OUT drops have stock=0: ${allSoldOutZero ? '✓' : '✗'} (checked ${soldOut.length})`);

  const sampleDrop = await prisma.drop.findFirst({
    where: { orders: { some: {} } },
    include: { _count: { select: { orders: true } } },
  });
  if (sampleDrop) {
    console.log(`   Sample drop "${sampleDrop.title}": stock=${sampleDrop.stock}, orders=${sampleDrop._count.orders}`);
  }

  const demoEmails = ['admin@demo.io', 'influencer@demo.io', 'laura.fit@demo.io'];
  for (const email of demoEmails) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) {
      console.log(`   ${email}: ✗ not found`);
      continue;
    }
    const ok = await bcrypt.compare(DEMO_PASSWORD, u.password);
    console.log(`   bcrypt('${DEMO_PASSWORD}', ${email}): ${ok ? '✓' : '✗'}`);
  }

  const sampleOrders = await prisma.order.findMany({ take: 20 });
  let coherent = 0;
  for (const o of sampleOrders) {
    const expected = round2(Math.max(0, o.subtotal - o.discount));
    if (Math.abs(expected - o.total) < 0.01) coherent++;
  }
  console.log(`   Order totals coherent (max(0,subtotal-discount)==total): ${coherent}/${sampleOrders.length}`);

  const laura = await prisma.user.findUnique({
    where: { email: 'laura.fit@demo.io' },
    include: { _count: { select: { drops: true, orders: true } } },
  });
  console.log(`   laura.fit@demo.io: drops=${laura?._count.drops}, orders=${laura?._count.orders}`);
}

async function main() {
  console.log('🌱 Starting demo seed...');
  console.log(`   DATABASE_URL=${process.env.DATABASE_URL ?? '<unset>'}`);

  await wipe();

  const users = await seedUsers();
  const drops = await seedDrops(users);
  const discountCodes = await seedDiscountCodes(users, drops);
  const webhooks = await seedWebhooks(users);
  const { orders, codesUses } = await seedOrders(drops, discountCodes);
  await updateDropStocks(drops);
  await updateDiscountCodeUses(codesUses);
  await seedVisitors(drops, users);
  await seedWebhookDeliveries(webhooks, orders);
  await seedOtpCodes(users);
  await seedAuditLogs(users, drops, discountCodes, orders);

  await verify(users);

  console.log('\n✅ Seed complete!');
  console.log('   Demo credentials (password: Demo1234!):');
  console.log('     - admin@demo.io          (ADMIN)');
  console.log('     - influencer@demo.io     (INFLUENCER)');
  console.log('     - laura.fit@demo.io      (INFLUENCER, rich data)');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
