import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createActivitySchema,
  updateActivitySchema,
  activityFilterSchema,
  ApiResponse,
  ActivitySessionDTO,
} from '@tempo/shared';
import { ActivityService } from '../services/activity.service';

export const activityRouter: Router = Router();
const activityService = new ActivityService();

activityRouter.use(requireAuth);

// POST /api/activities - Log a work/study activity session
activityRouter.post(
  '/',
  validateBody(createActivitySchema),
  async (req: Request, res: Response<ApiResponse<ActivitySessionDTO>>, next: NextFunction) => {
    try {
      const activity = await activityService.createActivity(req.user!.id, req.body);
      res.status(201).json({ success: true, data: activity });
    } catch (err: any) {
      if (
        err.code === 'INVALID_TIMESTAMP' ||
        err.code === 'INVALID_INTERVAL' ||
        err.code === 'INVALID_DURATION'
      ) {
        res.status(400).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

// GET /api/activities - List activity sessions with optional filtering
activityRouter.get(
  '/',
  async (req: Request, res: Response<ApiResponse<ActivitySessionDTO[]>>, next: NextFunction) => {
    try {
      const parsedFilter = activityFilterSchema.parse(req.query);
      const activities = await activityService.getActivities(req.user!.id, parsedFilter);
      res.status(200).json({ success: true, data: activities });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid activity filter parameters',
            details: err.errors,
          },
        });
        return;
      }
      next(err);
    }
  }
);

// GET /api/activities/:id - Retrieve an activity session by ID
activityRouter.get(
  '/:id',
  async (req: Request, res: Response<ApiResponse<ActivitySessionDTO>>, next: NextFunction) => {
    try {
      const activity = await activityService.getActivityById(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: activity });
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

// PATCH /api/activities/:id - Update an activity session
activityRouter.patch(
  '/:id',
  validateBody(updateActivitySchema),
  async (req: Request, res: Response<ApiResponse<ActivitySessionDTO>>, next: NextFunction) => {
    try {
      const activity = await activityService.updateActivity(req.user!.id, req.params.id, req.body);
      res.status(200).json({ success: true, data: activity });
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      if (err.code === 'INVALID_INTERVAL' || err.code === 'INVALID_DURATION') {
        res.status(400).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/activities/:id - Delete an activity session
activityRouter.delete(
  '/:id',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const result = await activityService.deleteActivity(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);
