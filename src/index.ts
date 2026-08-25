import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import routes from './routes/index.js';

const app: Express = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS === '*'
    ? true
    : (process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || ['http://localhost:3000']),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), config.upload.dir)));

app.set('trust proxy', 1);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    app.listen(config.port, () => {
      logger.info(`${config.appName || 'Instant Drop'} API started`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Port: ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
