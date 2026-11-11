import { Router, Request, Response } from 'express';
import { registerSchema, loginSchema, ApiResponse, AuthResponseData } from '@tempo/shared';
import { validateBody } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { register, login, logout, isDatabaseConnectionError } from '../services/auth.service';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '../config';

export const authRouter: Router = Router();

// POST /api/auth/register
authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  async (req: Request, res: Response<ApiResponse<AuthResponseData>>) => {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await register(req.body, { userAgent, ipAddress });

      res.cookie(AUTH_COOKIE_NAME, result.rawToken, getAuthCookieOptions());

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          preference: result.preference,
        },
      });
    } catch (err: any) {
      if (isDatabaseConnectionError(err)) {
        res.status(503).json({
          success: false,
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database service is temporarily unavailable. Please try again shortly.',
          },
        });
        return;
      }
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: {
          code: err.code || 'REGISTRATION_FAILED',
          message: err.message || 'Registration failed',
        },
      });
    }
  }
);

// POST /api/auth/login
authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response<ApiResponse<AuthResponseData>>) => {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await login(req.body, { userAgent, ipAddress });

      res.cookie(AUTH_COOKIE_NAME, result.rawToken, getAuthCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          preference: result.preference,
        },
      });
    } catch (err: any) {
      if (isDatabaseConnectionError(err)) {
        res.status(503).json({
          success: false,
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Database service is temporarily unavailable. Please try again shortly.',
          },
        });
        return;
      }
      const status = err.status || 401;
      res.status(status).json({
        success: false,
        error: {
          code: err.code || 'LOGIN_FAILED',
          message: err.message || 'Login failed',
        },
      });
    }
  }
);

// POST /api/auth/logout
authRouter.post(
  '/logout',
  async (req: Request, res: Response<ApiResponse<{ message: string }>>) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || req.rawToken;
    if (token) {
      await logout(token);
    }

    res.clearCookie(AUTH_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Successfully logged out',
      },
    });
  }
);

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: Request, res: Response<ApiResponse<AuthResponseData>>) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user!,
      preference: req.preference || null,
    },
  });
});
