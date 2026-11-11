import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '@tempo/shared';
import { isTest } from '../config';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: (_req: Request, res: Response<ApiResponse>) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
      },
    });
  },
});
