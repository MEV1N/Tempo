import { Router, Request, Response } from 'express';
import { ApiResponse, UserPreferenceDTO, updatePreferencesSchema } from '@tempo/shared';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { getPreferences, updatePreferences } from '../services/preference.service';

export const preferenceRouter: Router = Router();

// GET /api/preferences
preferenceRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<UserPreferenceDTO>>) => {
    try {
      // Scoped strictly to authenticated user's ID
      const preferences = await getPreferences(req.user!.id);
      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_PREFERENCES_FAILED',
          message: err.message || 'Failed to fetch preferences',
        },
      });
    }
  }
);

// PUT /api/preferences
preferenceRouter.put(
  '/',
  requireAuth,
  validateBody(updatePreferencesSchema),
  async (req: Request, res: Response<ApiResponse<UserPreferenceDTO>>) => {
    try {
      // Multi-user isolation: identity always comes from req.user!.id
      const updated = await updatePreferences(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PREFERENCES_FAILED',
          message: err.message || 'Failed to update preferences',
        },
      });
    }
  }
);
