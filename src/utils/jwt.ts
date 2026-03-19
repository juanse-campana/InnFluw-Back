import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError();
  }
  
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError();
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch {
      // Token inválido, pero continuamos sin usuario
    }
  }
  next();
};

import { Response, NextFunction } from 'express';
