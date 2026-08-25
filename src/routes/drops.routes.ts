import { Router } from 'express';
import {
  getDrops,
  getPublicDropsBySeller,
  getDrop,
  getDropBySlug,
  createDrop,
  updateDrop,
  deleteDrop,
  trackVisitor,
} from '../controllers/drops.controller.js';
import { validate } from '../utils/errors.js';
import { createDropSchema, updateDropSchema } from '../utils/schemas.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/', authMiddleware, getDrops);
router.get('/public/seller/:sellerSlug', getPublicDropsBySeller);
router.get('/:id', authMiddleware, getDrop);
router.get('/slug/:slug', getDropBySlug);

router.post('/', authMiddleware, validate(createDropSchema), createDrop);
router.patch('/:id', authMiddleware, validate(updateDropSchema), updateDrop);
router.delete('/:id', authMiddleware, deleteDrop);

router.post('/track-visitor', trackVisitor);

export default router;
