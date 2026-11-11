import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createRecurringTaskSchema,
  updateRecurringTaskSchema,
  ApiResponse,
  RecurringTaskSeriesDTO,
} from '@tempo/shared';
import * as recurrenceService from '../services/recurrence.service';

export const recurrenceRouter: Router = Router();

recurrenceRouter.use(requireAuth);

// GET /api/recurring-tasks - List recurring task series
recurrenceRouter.get(
  '/',
  async (
    req: Request,
    res: Response<ApiResponse<RecurringTaskSeriesDTO[]>>,
    next: NextFunction
  ) => {
    try {
      const series = await recurrenceService.getRecurringSeries(req.user!.id);
      res.status(200).json({ success: true, data: series });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/recurring-tasks/:id - Get recurring task series details
recurrenceRouter.get(
  '/:id',
  async (req: Request, res: Response<ApiResponse<RecurringTaskSeriesDTO>>, next: NextFunction) => {
    try {
      const series = await recurrenceService.getRecurringSeriesById(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: series });
    } catch (err: any) {
      if (err.code === 'RECURRING_SERIES_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// POST /api/recurring-tasks - Create recurring series and generate occurrences
recurrenceRouter.post(
  '/',
  validateBody(createRecurringTaskSchema),
  async (
    req: Request,
    res: Response<ApiResponse<{ series: RecurringTaskSeriesDTO; generatedCount: number }>>,
    next: NextFunction
  ) => {
    try {
      const result = await recurrenceService.createRecurringSeries(req.user!.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      if (err.code === 'CATEGORY_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/recurring-tasks/:id - Update series
recurrenceRouter.put(
  '/:id',
  validateBody(updateRecurringTaskSchema),
  async (req: Request, res: Response<ApiResponse<RecurringTaskSeriesDTO>>, next: NextFunction) => {
    try {
      const updateFuture = req.query.updateFuture === 'true';
      const updated = await recurrenceService.updateRecurringSeries(
        req.user!.id,
        req.params.id,
        req.body,
        updateFuture
      );
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'RECURRING_SERIES_NOT_FOUND' || err.code === 'CATEGORY_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/recurring-tasks/:id - Delete series
recurrenceRouter.delete(
  '/:id',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const preserveCompleted = req.query.preserveCompleted !== 'false';
      await recurrenceService.deleteRecurringSeries(req.user!.id, req.params.id, preserveCompleted);
      res.status(200).json({
        success: true,
        data: { message: 'Recurring series deleted successfully' },
      });
    } catch (err: any) {
      if (err.code === 'RECURRING_SERIES_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);
