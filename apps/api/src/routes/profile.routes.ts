import { Router, Request, Response } from 'express';
import { ApiResponse, updateProfileSchema, UserDTO, UserPreferenceDTO } from '@tempo/shared';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { getProfile, updateProfile } from '../services/user.service';

export const profileRouter: Router = Router();

// GET /api/profile
profileRouter.get(
  '/',
  requireAuth,
  async (
    req: Request,
    res: Response<ApiResponse<{ user: UserDTO; preference: UserPreferenceDTO | null }>>
  ) => {
    try {
      const profile = await getProfile(req.user!.id);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: {
          code: err.code || 'PROFILE_FETCH_FAILED',
          message: err.message || 'Failed to fetch profile',
        },
      });
    }
  }
);

// PATCH /api/profile
profileRouter.patch(
  '/',
  requireAuth,
  validateBody(updateProfileSchema),
  async (
    req: Request,
    res: Response<ApiResponse<{ user: UserDTO; preference: UserPreferenceDTO | null }>>
  ) => {
    try {
      // Scoped strictly to authenticated user's ID
      const updated = await updateProfile(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: {
          code: err.code || 'PROFILE_UPDATE_FAILED',
          message: err.message || 'Failed to update profile',
        },
      });
    }
  }
);
