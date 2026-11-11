import { Request, Response, NextFunction } from 'express';
import { ApiResponse, APP_CONFIG } from '@tempo/shared';
import { isTest, CORS_ORIGIN } from '../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(req: Request, res: Response<ApiResponse>, next: NextFunction): void {
  const isTestBypass = isTest && !req.headers['x-test-csrf-enforce'];
  if (isTestBypass || SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Exempt public registration/login endpoints from CSRF token requirement
  const isAuthEntry = req.path === '/api/auth/login' || req.path === '/api/auth/register';

  if (isAuthEntry) {
    return next();
  }

  // Validate Origin / Referer if provided
  const source = req.headers['origin'] || req.headers['referer'];

  if (source && typeof source === 'string') {
    const isLocalhost =
      source.startsWith('http://localhost:') || source.startsWith('http://127.0.0.1:');
    if (!isLocalhost && !source.startsWith(CORS_ORIGIN)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID_ORIGIN',
          message: 'Cross-site request forgery protection: Invalid origin',
        },
      });
      return;
    }
  }

  // Validate custom CSRF header for state-changing requests
  const csrfHeader = req.headers[APP_CONFIG.CSRF_HEADER_NAME] || req.headers['x-requested-with'];
  if (!csrfHeader) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_MISSING_HEADER',
        message: 'Missing required CSRF protection header',
      },
    });
    return;
  }

  next();
}
