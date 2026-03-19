import { Router } from 'express';
import { getDropAnalytics, getDashboardStats } from '../controllers/analytics.controller.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/dashboard', authMiddleware, getDashboardStats);
router.get('/drops/:id', authMiddleware, getDropAnalytics);

export default router;
