import { Request, Response, NextFunction } from 'express';
import { ApiResponse, UserDTO, UserPreferenceDTO } from '@tempo/shared';
import { AUTH_COOKIE_NAME } from '../config';
import { validateSession, isDatabaseConnectionError } from '../services/auth.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDTO;
      preference?: UserPreferenceDTO | null;
      sessionId?: string;
      rawToken?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[AUTH_COOKIE_NAME] || extractBearerToken(req);

  if (!token) {
    // eslint-disable-next-line no-console
    console.log(
      '[AUTH_DIAGNOSTIC] requireAuth: No session token provided in cookies or Authorization header'
    );
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Please log in.',
      },
    });
    return;
  }

  try {
    const sessionData = await validateSession(token);

    if (!sessionData) {
      // eslint-disable-next-line no-console
      console.log(
        '[AUTH_DIAGNOSTIC] requireAuth: Session is invalid, expired, or revoked -> clearing cookie & returning 401'
      );
      res.clearCookie(AUTH_COOKIE_NAME, { path: '/', httpOnly: true });
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Your session has expired or is invalid. Please log in again.',
        },
      });
      return;
    }

    req.user = sessionData.user;
    req.preference = sessionData.preference;
    req.sessionId = sessionData.sessionId;
    req.rawToken = token;

    next();
  } catch (err: any) {
    if (isDatabaseConnectionError(err)) {
      // eslint-disable-next-line no-console
      console.error(
        '[AUTH_DIAGNOSTIC] requireAuth: Database connection failure during auth verification -> returning 503 without clearing cookie'
      );
      res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Authentication service temporarily unavailable. Please try again shortly.',
        },
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(
      `[AUTH_DIAGNOSTIC] requireAuth: Unexpected internal error during auth verification: ${err.message || err}`
    );
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected authentication error occurred.',
      },
    });
  }
}

export async function optionalAuth(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[AUTH_COOKIE_NAME] || extractBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    const sessionData = await validateSession(token);
    if (sessionData) {
      req.user = sessionData.user;
      req.preference = sessionData.preference;
      req.sessionId = sessionData.sessionId;
      req.rawToken = token;
    } else {
      // Supplied token was invalid or expired: clear cookie and proceed anonymously
      res.clearCookie(AUTH_COOKIE_NAME, { path: '/', httpOnly: true });
    }

    next();
  } catch (err: any) {
    if (isDatabaseConnectionError(err)) {
      // eslint-disable-next-line no-console
      console.error(
        '[AUTH_DIAGNOSTIC] optionalAuth: Database connection failure -> returning 503 without clearing cookie'
      );
      res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Service temporarily unavailable. Please try again shortly.',
        },
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.error(`[AUTH_DIAGNOSTIC] optionalAuth: Unexpected error: ${err.message || err}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected authentication error occurred.',
      },
    });
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}
