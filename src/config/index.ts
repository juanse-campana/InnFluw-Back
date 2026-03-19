import dotenv from 'dotenv';
dotenv.config();

export const APP_NAME = 'Instant Drop';

export const config = {
  appName: APP_NAME,
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/instant_drop',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  email: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@instantdrop.io',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    otpMax: 5,
  },

  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  },

  otp: {
    expiresInMinutes: 5,
    length: 6,
  },
};
