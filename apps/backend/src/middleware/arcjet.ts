import arcjet, { detectBot, shield, tokenBucket } from '@arcjet/node';
import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/env';
import { TooManyRequestsError, ForbiddenError } from './error-handler';

// Initialize Arcjet
const aj = arcjet({
  key: config.arcjet.key || 'test-key',
  rules: [
    // Bot detection
    detectBot({
      mode: 'LIVE',
      allow: ['CATEGORY:SEARCH_ENGINE'], // Allow search engine bots
    }),
    // Shield against common attacks
    shield({
      mode: 'LIVE',
    }),
    // Rate limiting with token bucket
    tokenBucket({
      mode: 'LIVE',
      refillRate: 10,
      interval: 60,
      capacity: 100,
    }),
  ],
});

export const arcjetMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  if (!config.arcjet.key) {
    return next();
  }

  try {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new TooManyRequestsError('Rate limit exceeded');
      }

      if (decision.reason.isBot()) {
        throw new ForbiddenError('Bot detected');
      }

      if (decision.reason.isShield()) {
        throw new ForbiddenError('Suspicious activity detected');
      }

      throw new ForbiddenError('Request blocked');
    }

    next();
  } catch (error) {
    next(error);
  }
};
