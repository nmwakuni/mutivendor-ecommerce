import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/config/logger';
import { Sentry } from '@/config/sentry';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable Entity') {
    super(422, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too Many Requests') {
    super(429, message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(500, message, false);
  }
}

interface ErrorResponse {
  status: 'error';
  statusCode: number;
  message: string;
  errors?: unknown;
  stack?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Send to Sentry if not operational
  if (!(err instanceof AppError) || !err.isOperational) {
    Sentry.captureException(err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    const response: ErrorResponse = {
      status: 'error',
      statusCode: 400,
      message: 'Validation error',
      errors: errorMessages,
    };

    return res.status(400).json(response);
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        error = new ConflictError('A record with this value already exists');
        break;
      case 'P2025':
        error = new NotFoundError('Record not found');
        break;
      case 'P2003':
        error = new BadRequestError('Invalid reference');
        break;
      default:
        error = new InternalServerError('Database error');
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    error = new BadRequestError('Invalid data provided');
  }

  // Handle App errors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      status: 'error',
      statusCode: error.statusCode,
      message: error.message,
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    return res.status(error.statusCode).json(response);
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    status: 'error',
    statusCode: 500,
    message: 'Something went wrong',
  };

  if (process.env.NODE_ENV === 'development') {
    response.message = err.message;
    response.stack = err.stack;
  }

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};
