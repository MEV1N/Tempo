import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  generateScheduleSchema,
  updateScheduleBlockSchema,
  toggleBlockLockSchema,
  rescheduleSchema,
  restoreVersionSchema,
} from '@tempo/shared';
import { SchedulerService } from '../services/scheduler.service';

const router: Router = Router();
const schedulerService = new SchedulerService();

// Require authentication for all schedule routes
router.use(requireAuth);

/**
 * POST /api/schedule/generate
 * Generates and persists a proposed daily schedule for the user and target date.
 */
router.post(
  '/generate',
  validateBody(generateScheduleSchema),
  async (req: Request, res: Response) => {
    try {
      const schedule = await schedulerService.generateSchedule(req.user!.id, req.body);
      return res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (err: any) {
      const status = err.code === 'CONFIRMED_SCHEDULE_EXISTS' ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: {
          code: err.code || 'SCHEDULE_GENERATION_FAILED',
          message: err.message || 'Failed to generate schedule',
        },
      });
    }
  }
);

/**
 * GET /api/schedule
 * Retrieves the active schedule for the specified date (defaults to today).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    let dateStr = (req.query.date as string) || '';
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dateStr = new Date().toISOString().substring(0, 10);
    }

    const schedule = await schedulerService.getSchedule(req.user!.id, dateStr);
    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_FETCH_FAILED',
        message: err.message || 'Failed to retrieve schedule',
      },
    });
  }
});

/**
 * GET /api/schedule/history
 * Retrieves all schedule instances on a given date.
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    let dateStr = (req.query.date as string) || '';
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dateStr = new Date().toISOString().substring(0, 10);
    }

    const schedules = await schedulerService.getScheduleHistory(req.user!.id, dateStr);
    return res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SCHEDULE_HISTORY_FETCH_FAILED',
        message: err.message || 'Failed to retrieve schedule history',
      },
    });
  }
});

/**
 * POST /api/schedule/:id/confirm
 * Confirms a proposed schedule.
 */
router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const confirmed = await schedulerService.confirmSchedule(req.user!.id, req.params.id);
    return res.status(200).json({
      success: true,
      data: confirmed,
    });
  } catch (err: any) {
    const status = err.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: err.code || 'CONFIRM_FAILED',
        message: err.message || 'Failed to confirm schedule',
      },
    });
  }
});

/**
 * POST /api/schedule/:id/reject
 * Rejects and deletes a proposed schedule.
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.rejectSchedule(req.user!.id, req.params.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const status = err.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({
      success: false,
      error: {
        code: err.code || 'REJECT_FAILED',
        message: err.message || 'Failed to reject schedule',
      },
    });
  }
});

/**
 * PATCH /api/schedule/blocks/:id
 * Manually edits an individual schedule block.
 */
router.patch(
  '/blocks/:id',
  validateBody(updateScheduleBlockSchema),
  async (req: Request, res: Response) => {
    try {
      const updated = await schedulerService.updateBlock(req.user!.id, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: {
          code: err.code || 'BLOCK_UPDATE_FAILED',
          message: err.message || 'Failed to update schedule block',
        },
      });
    }
  }
);

/**
 * PATCH /api/schedule/blocks/:id/lock
 * Toggles the lock state of a schedule block.
 */
router.patch(
  '/blocks/:id/lock',
  validateBody(toggleBlockLockSchema),
  async (req: Request, res: Response) => {
    try {
      const block = await schedulerService.toggleBlockLock(
        req.user!.id,
        req.params.id,
        req.body.isLocked
      );
      return res.status(200).json({
        success: true,
        data: block,
      });
    } catch (err: any) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: {
          code: err.code || 'LOCK_TOGGLE_FAILED',
          message: err.message || 'Failed to toggle block lock',
        },
      });
    }
  }
);

/**
 * POST /api/schedule/:id/reschedule
 * Intelligently reschedules an existing schedule using minimal-change strategy.
 */
router.post(
  '/:id/reschedule',
  validateBody(rescheduleSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await schedulerService.reschedule(req.user!.id, req.params.id, req.body);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: {
          code: err.code || 'RESCHEDULE_FAILED',
          message: err.message || 'Failed to reschedule',
        },
      });
    }
  }
);

/**
 * GET /api/schedule/:id/versions
 * Retrieves version history for a schedule.
 */
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await schedulerService.getVersions(req.user!.id, req.params.id);
    return res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'VERSIONS_FETCH_FAILED',
        message: err.message || 'Failed to retrieve schedule versions',
      },
    });
  }
});

/**
 * POST /api/schedule/:id/restore
 * Restores a schedule to an earlier version.
 */
router.post(
  '/:id/restore',
  validateBody(restoreVersionSchema),
  async (req: Request, res: Response) => {
    try {
      const restored = await schedulerService.restoreVersion(
        req.user!.id,
        req.params.id,
        req.body.versionNumber
      );
      return res.status(200).json({
        success: true,
        data: restored,
      });
    } catch (err: any) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: {
          code: err.code || 'RESTORE_FAILED',
          message: err.message || 'Failed to restore schedule version',
        },
      });
    }
  }
);

export default router;
