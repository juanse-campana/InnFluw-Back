import { Router } from 'express';
import {
  getWebhooksHandler,
  createWebhookHandler,
  deleteWebhookHandler,
  getWebhookLogsHandler,
} from '../controllers/webhooks.controller.js';
import { validate } from '../utils/errors.js';
import { createWebhookSchema } from '../utils/schemas.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/', authMiddleware, getWebhooksHandler);
router.post('/', authMiddleware, validate(createWebhookSchema), createWebhookHandler);
router.delete('/:id', authMiddleware, deleteWebhookHandler);
router.get('/:id/logs', authMiddleware, getWebhookLogsHandler);

export default router;
