import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  sendOrderConfirmationToBuyer,
  sendOrderNotificationToInfluencer,
} from './email.service.js';
import { triggerWebhooks } from './webhook.service.js';

export const emailQueue = new Queue('emails', {
  connection: { url: config.redis.url },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const webhookQueue = new Queue('webhooks', {
  connection: { url: config.redis.url },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

interface OrderEmailJob {
  type: 'buyer_confirmation' | 'influencer_notification';
  data: {
    buyerEmail?: string;
    buyerName: string;
    influencerEmail: string;
    influencerName: string;
    orderId: string;
    dropTitle: string;
    total: number;
    discount: number;
    buyerEmailForBuyer?: string;
    confirmationToken?: string;
  };
}

interface StockAlertJob {
  data: {
    dropId: string;
    dropTitle: string;
    influencerEmail: string;
    remainingStock: number;
  };
}

export const addOrderEmailJob = async (job: OrderEmailJob) => {
  await emailQueue.add('order-email', job, {
    jobId: `order-email-${job.data.orderId}-${job.type}`,
  });
  logger.info('Order email job added', { type: job.type, orderId: job.data.orderId });
};

export const addStockAlertJob = async (job: StockAlertJob) => {
  await emailQueue.add('stock-alert', job.data, {
    jobId: `stock-alert-${job.data.dropId}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
  logger.info('Stock alert job added', { dropId: job.data.dropId });
};

export const addWebhookJob = async (
  webhookType: string,
  data: { dropId?: string; orderId?: string; payload: Record<string, unknown> }
) => {
  await webhookQueue.add('webhook-trigger', { type: webhookType, ...data });
  logger.info('Webhook job added', { type: webhookType });
};

const emailWorker = new Worker<OrderEmailJob>(
  'emails',
  async (job: Job<OrderEmailJob>) => {
    const { type, data } = job.data;

    switch (type) {
      case 'buyer_confirmation':
        if (data.buyerEmail && data.confirmationToken) {
          await sendOrderConfirmationToBuyer(data.buyerEmail, data.buyerName, {
            orderId: data.orderId,
            dropTitle: data.dropTitle,
            total: data.total,
            confirmationToken: data.confirmationToken,
          });
        }
        break;

      case 'influencer_notification':
        await sendOrderNotificationToInfluencer(
          data.influencerEmail,
          data.influencerName,
          {
            orderId: data.orderId,
            dropTitle: data.dropTitle,
            buyerName: data.buyerName,
            buyerEmail: data.buyerEmailForBuyer || '',
            total: data.total,
            discount: data.discount,
          }
        );
        break;
    }
  },
  {
    connection: { url: config.redis.url },
    concurrency: config.queue.concurrency,
  }
);

emailWorker.on('completed', (job) => {
  logger.info('Email job completed', { id: job.id, type: job.data.type });
});

emailWorker.on('failed', (job, err) => {
  logger.error('Email job failed', { id: job?.id, error: err.message });
});

interface WebhookJob {
  type: string;
  dropId?: string;
  orderId?: string;
  payload: Record<string, unknown>;
}

const webhookWorker = new Worker<WebhookJob>(
  'webhooks',
  async (job: Job<WebhookJob>) => {
    const { type, dropId, orderId, payload } = job.data;
    await triggerWebhooks(type, { dropId, orderId, payload });
  },
  {
    connection: { url: config.redis.url },
    concurrency: config.queue.concurrency,
  }
);

webhookWorker.on('completed', (job) => {
  logger.info('Webhook job completed', { id: job.id, type: job.data.type });
});

webhookWorker.on('failed', (job, err) => {
  logger.error('Webhook job failed', { id: job?.id, error: err.message });
});

export const closeQueues = async () => {
  await emailQueue.close();
  await webhookQueue.close();
  await emailWorker.close();
  await webhookWorker.close();
  logger.info('All queues closed');
};
