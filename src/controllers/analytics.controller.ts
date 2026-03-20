import { Response } from 'express';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler, NotFoundError } from '../utils/errors.js';
import { prisma } from '../config/database.js';

export const getDropAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const period = (req.query.period as string) || '30d';

  const startDate = new Date();
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  const drop = await prisma.drop.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!drop) {
    throw new NotFoundError('Drop no encontrado');
  }

  const [visitors, orders, discountCodes] = await Promise.all([
    prisma.visitor.count({
      where: { dropId: id, createdAt: { gte: startDate } },
    }),
    prisma.order.findMany({
      where: {
        dropId: id,
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: { total: true, discount: true },
    }),
    prisma.discountCode.findMany({
      where: {
        drops: { some: { dropId: id } },
      },
      include: {
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);
  const conversionRate = visitors > 0 ? (orders.length / visitors) * 100 : 0;

  const topCodes = discountCodes
    .filter((c) => c._count.orders > 0)
    .sort((a, b) => b._count.orders - a._count.orders)
    .slice(0, 5)
    .map((c) => ({
      code: c.code,
      uses: c._count.orders,
      type: c.type,
      value: c.value,
    }));

  const dailyStats = await getDailyStats(id, startDate);

  res.json({
    success: true,
    data: {
      dropId: id,
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
      summary: {
        visitors,
        orders: orders.length,
        revenue: totalRevenue,
        totalDiscount,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      topCodes,
      dailyStats,
    },
  });
});

async function getDailyStats(dropId: string, startDate: Date) {
  const visitorsByDay = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM visitors
    WHERE drop_id = ${dropId} AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  const ordersByDay = await prisma.$queryRaw<Array<{ date: Date; orders: bigint; revenue: number }>>`
    SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE drop_id = ${dropId} AND created_at >= ${startDate} AND status IN ('PENDING', 'CONFIRMED')
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  return {
    visitors: visitorsByDay.map((v) => ({
      date: v.date,
      count: Number(v.count),
    })),
    orders: ordersByDay.map((o) => ({
      date: o.date,
      orders: Number(o.orders),
      revenue: Number(o.revenue),
    })),
  };
}

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = (req.query.period as string) || '30d';

  const startDate = new Date();
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  const [totalDrops, activeDrops, totalVisitors, totalOrders, totalRevenue] = await Promise.all([
    prisma.drop.count({ where: { userId: req.user!.userId } }),
    prisma.drop.count({ where: { userId: req.user!.userId, status: 'LIVE' } }),
    prisma.visitor.count({
      where: {
        drop: { userId: req.user!.userId },
        createdAt: { gte: startDate },
      },
    }),
    prisma.order.count({
      where: {
        userId: req.user!.userId,
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    }),
    prisma.order.aggregate({
      where: {
        userId: req.user!.userId,
        createdAt: { gte: startDate },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      _sum: { total: true },
    }),
  ]);

  const recentOrders = await prisma.order.findMany({
    where: {
      userId: req.user!.userId,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      drop: { select: { title: true } },
    },
  });

  res.json({
    success: true,
    data: {
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
      summary: {
        totalDrops,
        activeDrops,
        totalVisitors,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
      },
      recentOrders,
    },
  });
});
