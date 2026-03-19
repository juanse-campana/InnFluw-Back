import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
}

export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    max = config.rateLimit.max,
    keyPrefix = 'rl',
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      const ttl = await redis.ttl(key);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

      if (current > max) {
        throw new AppError(429, 'Demasiadas solicitudes, intenta más tarde');
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next();
      }
    }
  };
};

export const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.otpMax,
  keyPrefix: 'otp',
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth',
});

export const checkoutRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'checkout',
});
