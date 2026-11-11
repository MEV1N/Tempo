import { CookieOptions } from 'express';
import { APP_CONFIG } from '@tempo/shared';

export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

export const AUTH_COOKIE_NAME = APP_CONFIG.AUTH_COOKIE_NAME;

export const SESSION_MAX_AGE_MS = APP_CONFIG.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export const getAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
});

export const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BFuWlJhM3yCsY8c26RwMoqviRmWi8dtwZKMTM585qIGOQt7CPhYlyaFg7_lb7WERJal-PnEIh0qpKtRzW0c52RE';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'u4uF-o_szZ93TN8VuuMiMT36zRdr3rHJHe4vWrQOQGI';

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tempo.app';

// Google OAuth & Calendar Configuration (Phase 7)
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret';
export const API_BASE_URL =
  process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
export const FRONTEND_URL = process.env.CORS_ORIGIN || 'http://localhost:3000';
export const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'tempo-default-secret-encryption-key-for-dev';
