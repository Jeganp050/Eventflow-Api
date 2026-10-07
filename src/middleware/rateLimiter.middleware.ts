import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ErrorCode } from '../errors/errorCodes';

const standardErrorResponse = (message: string) => ({
  success: false,
  error: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message,
  },
});

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      standardErrorResponse('Too many requests across the API. Please slow down.')
    );
  },
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      standardErrorResponse('Too many authentication attempts. Please try again in a minute.')
    );
  },
});

export const bookingRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.BOOKING_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per authenticated user if present, else fallback to IP
    return (req as any).user?.sub || req.ip || 'anonymous';
  },
  handler: (req, res) => {
    res.status(429).json(
      standardErrorResponse('Too many booking attempts. Please wait a moment before trying again.')
    );
  },
});
