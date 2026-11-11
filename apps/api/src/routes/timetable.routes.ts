import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTimetableSchema,
  updateTimetableSchema,
  createSessionSchema,
  updateSessionSchema,
  ApiResponse,
  TimetableDTO,
  TimetableSessionDTO,
} from '@tempo/shared';
import * as timetableService from '../services/timetable.service';

export const timetableRouter: Router = Router();

timetableRouter.use(requireAuth);

// GET /api/timetables - Retrieve active weekly timetable with sessions
timetableRouter.get(
  '/',
  async (req: Request, res: Response<ApiResponse<TimetableDTO | null>>, next: NextFunction) => {
    try {
      const timetable = await timetableService.getActiveTimetable(req.user!.id);
      res.status(200).json({ success: true, data: timetable });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/timetables - Create timetable
timetableRouter.post(
  '/',
  validateBody(createTimetableSchema),
  async (req: Request, res: Response<ApiResponse<TimetableDTO>>, next: NextFunction) => {
    try {
      const timetable = await timetableService.createTimetable(req.user!.id, req.body);
      res.status(201).json({ success: true, data: timetable });
    } catch (err: any) {
      if (err.code === 'SESSION_OVERLAP_CONFLICT') {
        res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/timetables/:id - Update timetable details
timetableRouter.put(
  '/:id',
  validateBody(updateTimetableSchema),
  async (req: Request, res: Response<ApiResponse<TimetableDTO>>, next: NextFunction) => {
    try {
      const updated = await timetableService.updateTimetable(req.user!.id, req.params.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'TIMETABLE_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// POST /api/timetables/:id/sessions - Add session to timetable
timetableRouter.post(
  '/:id/sessions',
  validateBody(createSessionSchema),
  async (req: Request, res: Response<ApiResponse<TimetableSessionDTO>>, next: NextFunction) => {
    try {
      const session = await timetableService.addSession(req.user!.id, req.params.id, req.body);
      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      if (err.code === 'TIMETABLE_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      if (err.code === 'SESSION_OVERLAP_CONFLICT') {
        res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/timetables/sessions/:sessionId - Update individual session
timetableRouter.put(
  '/sessions/:sessionId',
  validateBody(updateSessionSchema),
  async (req: Request, res: Response<ApiResponse<TimetableSessionDTO>>, next: NextFunction) => {
    try {
      const session = await timetableService.updateSession(
        req.user!.id,
        req.params.sessionId,
        req.body
      );
      res.status(200).json({ success: true, data: session });
    } catch (err: any) {
      if (err.code === 'SESSION_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      if (err.code === 'SESSION_OVERLAP_CONFLICT') {
        res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/timetables/sessions/:sessionId - Delete session
timetableRouter.delete(
  '/sessions/:sessionId',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      await timetableService.deleteSession(req.user!.id, req.params.sessionId);
      res.status(200).json({ success: true, data: { message: 'Session deleted successfully' } });
    } catch (err: any) {
      if (err.code === 'SESSION_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);
