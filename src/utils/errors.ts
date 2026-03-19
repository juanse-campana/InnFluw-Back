import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { ERROR_MESSAGES } from '../config/constants.js';
import { config } from '../config/index.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(public errors: ZodError['errors']) {
    super(400, ERROR_MESSAGES.VALIDATION_ERROR);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, ERROR_MESSAGES.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, ERROR_MESSAGES.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = ERROR_MESSAGES.NOT_FOUND) {
    super(404, message);
  }
}

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        errors: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.statusCode.toString(),
        message: err.message,
      },
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production' 
        ? ERROR_MESSAGES.INTERNAL_ERROR 
        : err.message,
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${req.method} ${req.path} no encontrada`,
    },
  });
};

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error));
      } else {
        next(error);
      }
    }
  };
};
