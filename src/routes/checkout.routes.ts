import { Router } from 'express';
import {
  simulateCheckout,
  confirmOrder,
  confirmOrderBySeller,
  getOrders,
  getOrder,
} from '../controllers/checkout.controller.js';
import { validate } from '../utils/errors.js';
import { checkoutSchema } from '../utils/schemas.js';
import { authMiddleware, checkoutRateLimit } from '../middleware/index.js';

const router = Router();

router.post('/simulate', checkoutRateLimit, validate(checkoutSchema), simulateCheckout);

router.get('/orders', authMiddleware, getOrders);
router.get('/orders/:id', authMiddleware, getOrder);
router.post('/orders/:id/confirm', authMiddleware, confirmOrderBySeller);

router.post('/confirm/:token', confirmOrder);

export default router;
