import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { triggerPlanningSchema, ApiResponse, PlanningStatusDTO } from '@tempo/shared';
import { NightlyPlanningService } from '../services/planning.service';

export const planningRouter: Router = Router();
const planningService = new NightlyPlanningService();

planningRouter.use(requireAuth);

// GET /api/planning/status - Get user's current planning status for tomorrow
planningRouter.get(
  '/status',
  async (req: Request, res: Response<ApiResponse<PlanningStatusDTO>>, next: NextFunction) => {
    try {
      const status = await planningService.getPlanningStatus(req.user!.id);
      res.status(200).json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/planning/trigger - Manually trigger planning for the current user
planningRouter.post(
  '/trigger',
  validateBody(triggerPlanningSchema),
  async (
    req: Request,
    res: Response<
      ApiResponse<{
        status: 'READY' | 'CONFIRMED' | 'NO_TASKS' | 'SKIPPED_DISABLED';
        scheduleId?: string;
        message: string;
      }>
    >,
    next: NextFunction
  ) => {
    try {
      const result = await planningService.executePlanningForUser(req.user!.id, {
        targetDate: req.body.targetDate,
        forceRegenerate: req.body.forceRegenerate,
        isManualTrigger: true,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);
