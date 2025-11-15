import rateLimit from 'express-rate-limit';
import { config } from '@/config/env';
import { TooManyRequestsError } from './error-handler';

export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, _next, _options) => {
    throw new TooManyRequestsError('Too many requests, please try again later');
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, _res, _next, _options) => {
    throw new TooManyRequestsError('Too many login attempts, please try again in 15 minutes');
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, _next, _options) => {
    throw new TooManyRequestsError('API rate limit exceeded');
  },
});

export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 payment requests per minute
  message: 'Too many payment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, _next, _options) => {
    throw new TooManyRequestsError('Too many payment requests, please slow down');
  },
});
