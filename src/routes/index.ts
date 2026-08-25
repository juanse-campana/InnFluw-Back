import { Router, Request, Response } from 'express';
import { APP_NAME } from '../config/constants.js';

import authRoutes from './auth.routes.js';
import dropsRoutes from './drops.routes.js';
import discountCodesRoutes from './discountCodes.routes.js';
import checkoutRoutes from './checkout.routes.js';
import webhooksRoutes from './webhooks.routes.js';
import analyticsRoutes from './analytics.routes.js';
import uploadRoutes from './upload.routes.js';
import bankAccountsRoutes from './bankAccounts.routes.js';
import usersRoutes from './users.routes.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      app: APP_NAME,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: APP_NAME,
      version: '1.0.0',
      description: 'API REST para Instant Drop SaaS',
      documentation: '/api/v1/health',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/drops', dropsRoutes);
router.use('/discount-codes', discountCodesRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/upload', uploadRoutes);
router.use('/bank-accounts', bankAccountsRoutes);
router.use('/users', usersRoutes);

export default router;
