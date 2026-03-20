import { Response } from 'express';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler } from '../utils/errors.js';
import { createWebhookSchema } from '../utils/schemas.js';
import { createWebhook, deleteWebhook, getWebhooks, getWebhookDeliveries } from '../services/webhook.service.js';
import { SUCCESS_MESSAGES } from '../config/constants.js';

export const getWebhooksHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const webhooks = await getWebhooks(req.user!.userId);

  res.json({
    success: true,
    data: { webhooks },
  });
});

export const createWebhookHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = createWebhookSchema.parse(req.body);

  const webhook = await createWebhook(req.user!.userId, data.url, data.events);

  res.status(201).json({
    success: true,
    message: SUCCESS_MESSAGES.WEBHOOK_CREATED,
    data: { webhook },
  });
});

export const deleteWebhookHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  await deleteWebhook(id, req.user!.userId);

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.WEBHOOK_DELETED,
  });
});

export const getWebhookLogsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const limit = (req.query.limit as string) || '20';

  const deliveries = await getWebhookDeliveries(
    id,
    req.user!.userId,
    parseInt(limit, 10)
  );

  res.json({
    success: true,
    data: { deliveries },
  });
});
