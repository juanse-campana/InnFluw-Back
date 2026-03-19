import { Response, NextFunction } from 'express';
import { AuthRequest, requireAuth } from '../utils/jwt.js';
import { ForbiddenError } from '../utils/errors.js';

export const authMiddleware = requireAuth;

export const influencerOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'INFLUENCER' && req.user?.role !== 'ADMIN') {
    throw new ForbiddenError();
  }
  next();
};

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'ADMIN') {
    throw new ForbiddenError();
  }
  next();
};
