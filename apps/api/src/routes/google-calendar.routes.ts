import { Router, Request, Response } from 'express';
import { googleCalendarService } from '../services/google-calendar.service';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { verifySignedOAuthState } from '../services/crypto.service';
import { FRONTEND_URL } from '../config';

const router: Router = Router();

/**
 * GET /api/google-calendar/connect
 * Initiates Google Calendar authorization with narrow read-only scope.
 */
router.get('/connect', requireAuth, (req: Request, res: Response) => {
  const { url, state } = googleCalendarService.getCalendarAuthUrl(req.user!.id);

  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json({
      success: true,
      data: { url, state },
    });
  }

  return res.redirect(url);
});

/**
 * GET /api/google-calendar/callback
 * Handles Google Calendar authorization callback.
 * Validates that authorized Google account matches user's linked Google identity.
 */
router.get('/callback', optionalAuth, async (req: Request, res: Response) => {
  const { code, state, error: googleError } = req.query;

  if (googleError) {
    const errorMsg = encodeURIComponent(String(googleError));
    return res.redirect(`${FRONTEND_URL}/profile?error=${errorMsg}`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/profile?error=missing_calendar_oauth_parameters`);
  }

  // Recover user ID from state token if cookie session not passed directly
  let targetUserId = req.user?.id;
  if (!targetUserId) {
    const verified = verifySignedOAuthState<{ userId: string }>(String(state));
    targetUserId = verified?.userId;
  }

  if (!targetUserId) {
    return res.redirect(`${FRONTEND_URL}/login?error=session_expired`);
  }

  try {
    const result = await googleCalendarService.handleCallback({
      code: String(code),
      state: String(state),
      authenticatedUserId: targetUserId,
    });

    return res.redirect(result.redirectUrl);
  } catch (err: any) {
    const errorCode = err.code || 'CALENDAR_CONNECT_FAILED';
    const message = encodeURIComponent(err.message || 'Google Calendar connection failed');
    return res.redirect(`${FRONTEND_URL}/profile?error=${errorCode}&message=${message}`);
  }
});

/**
 * GET /api/google-calendar/status
 * Returns connection, authorization, and synchronization status.
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await googleCalendarService.getStatus(req.user!.id);
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_FETCH_FAILED',
        message: err.message,
      },
    });
  }
});

/**
 * POST /api/google-calendar/sync
 * Manually triggers Google Calendar synchronization.
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const forceFullSync = req.body?.forceFullSync === true;
    const result = await googleCalendarService.syncUserCalendar(req.user!.id, forceFullSync);
    return res.status(200).json({
      success: true,
      data: {
        message: 'Calendar synchronized successfully.',
        ...result,
      },
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'SYNC_FAILED',
        message: err.message,
      },
    });
  }
});

/**
 * POST /api/google-calendar/disconnect
 * Disconnects Google Calendar without deleting user account or login identity.
 */
router.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    await googleCalendarService.disconnectCalendar(req.user!.id);
    return res.status(200).json({
      success: true,
      data: { message: 'Google Calendar disconnected successfully.' },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'DISCONNECT_FAILED',
        message: err.message,
      },
    });
  }
});

export { router as googleCalendarRouter };
