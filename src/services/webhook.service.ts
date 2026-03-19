import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

interface WebhookPayload {
  dropId?: string;
  orderId?: string;
  payload: any;
}

export const triggerWebhooks = async (
  eventType: string,
  data: WebhookPayload
) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: {
          has: eventType,
        },
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    const relevantWebhooks = webhooks.filter((webhook) => {
      if (!data.dropId) return true;
      return true;
    });

    const deliveryPromises = relevantWebhooks.map(async (webhook) => {
      const startTime = Date.now();

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-InstantDrop-Event': eventType,
          },
          body: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data: {
              ...data.payload,
              dropId: data.dropId,
              orderId: data.orderId,
            },
          }),
          signal: AbortSignal.timeout(10000),
        });

        const duration = Date.now() - startTime;

        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            dropId: data.dropId,
            orderId: data.orderId,
            status: 'success',
            statusCode: response.status,
            response: await response.text().catch(() => null),
          },
        });

        logger.info('Webhook delivered', {
          webhookId: webhook.id,
          eventType,
          statusCode: response.status,
          duration,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;

        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            dropId: data.dropId,
            orderId: data.orderId,
            status: 'failed',
            error: error.message,
          },
        });

        logger.error('Webhook delivery failed', {
          webhookId: webhook.id,
          eventType,
          error: error.message,
          duration,
        });
      }
    });

    await Promise.allSettled(deliveryPromises);
  } catch (error) {
    logger.error('Error triggering webhooks', { error, eventType, data });
  }
};

export const createWebhook = async (
  userId: string,
  url: string,
  events: string[]
) => {
  return prisma.webhook.create({
    data: {
      userId,
      url,
      events,
    },
  });
};

export const deleteWebhook = async (webhookId: string, userId: string) => {
  return prisma.webhook.delete({
    where: {
      id: webhookId,
      userId,
    },
  });
};

export const getWebhooks = async (userId: string) => {
  return prisma.webhook.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getWebhookDeliveries = async (
  webhookId: string,
  userId: string,
  limit = 20
) => {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, userId },
  });

  if (!webhook) return [];

  return prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};
