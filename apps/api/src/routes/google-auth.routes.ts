import { Router, Request, Response } from 'express';
import { googleAuthService } from '../services/google-auth.service';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { setPasswordSchema } from '@tempo/shared';
import { getAuthCookieOptions, AUTH_COOKIE_NAME, FRONTEND_URL } from '../config';

const router: Router = Router();

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 flow for login or account linking.
 */
router.get('/', optionalAuth, (req: Request, res: Response) => {
  const action = (req.query.action === 'link' ? 'link' : 'login') as 'login' | 'link';
  const authenticatedUserId = req.user?.id;

  if (action === 'link' && !authenticatedUserId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'You must be signed in to link a Google account.',
      },
    });
  }

  const { url, state } = googleAuthService.getGoogleAuthUrl({
    action,
    userId: authenticatedUserId,
  });

  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json({
      success: true,
      data: { url, state },
    });
  }

  return res.redirect(url);
});

/**
 * GET /api/auth/google/callback
 * Handles the redirect from Google with code and state.
 */
router.get('/callback', optionalAuth, async (req: Request, res: Response) => {
  const { code, state, error: googleError } = req.query;

  if (googleError) {
    const errorMsg = encodeURIComponent(String(googleError));
    return res.redirect(`${FRONTEND_URL}/login?error=${errorMsg}`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/login?error=missing_oauth_parameters`);
  }

  try {
    const result = await googleAuthService.handleCallback({
      code: String(code),
      state: String(state),
      meta: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      },
      authenticatedUserId: req.user?.id,
    });

    if (result.action === 'login' && result.rawToken) {
      res.cookie(AUTH_COOKIE_NAME, result.rawToken, getAuthCookieOptions());
    }

    return res.redirect(result.redirectUrl);
  } catch (err: any) {
    const errorCode = err.code || 'GOOGLE_AUTH_FAILED';
    const message = encodeURIComponent(err.message || 'Google authentication failed');
    return res.redirect(`${FRONTEND_URL}/login?error=${errorCode}&message=${message}`);
  }
});

/**
 * POST /api/auth/google/set-password
 * Allows a user (especially one registered via Google) to set a password.
 */
router.post(
  '/set-password',
  requireAuth,
  validateBody(setPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      await googleAuthService.setPassword(req.user!.id, req.body.password);
      return res.status(200).json({
        success: true,
        data: {
          message: 'Password set successfully. You can now log in using email and password.',
        },
      });
    } catch (err: any) {
      return res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'SET_PASSWORD_FAILED',
          message: err.message,
        },
      });
    }
  }
);

/**
 * DELETE /api/auth/google/unlink
 * Unlinks the Google identity from the user's Tempo account.
 * Requires an alternate authentication method (password) to prevent lockouts.
 */
router.delete('/unlink', requireAuth, async (req: Request, res: Response) => {
  try {
    await googleAuthService.unlinkGoogle(req.user!.id);
    return res.status(200).json({
      success: true,
      data: { message: 'Google account unlinked successfully.' },
    });
  } catch (err: any) {
    return res.status(err.status || 400).json({
      success: false,
      error: {
        code: err.code || 'UNLINK_FAILED',
        message: err.message,
      },
    });
  }
});

export { router as googleAuthRouter };
