import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  createCalendarExceptionSchema,
  updateCalendarExceptionSchema,
  ApiResponse,
  CalendarEventDTO,
  CalendarExceptionDTO,
  CalendarViewItemDTO,
} from '@tempo/shared';
import * as calendarService from '../services/calendar.service';

export const calendarRouter: Router = Router();

calendarRouter.use(requireAuth);

// GET /api/calendar/view - Unified schedule view (combines weekly timetable sessions, exceptions, and events)
calendarRouter.get(
  '/view',
  async (req: Request, res: Response<ApiResponse<CalendarViewItemDTO[]>>, next: NextFunction) => {
    try {
      const startDate = (req.query.startDate as string) || new Date().toISOString();
      const defaultEndDate = new Date();
      defaultEndDate.setDate(defaultEndDate.getDate() + 7);
      const endDate = (req.query.endDate as string) || defaultEndDate.toISOString();

      const items = await calendarService.getUnifiedCalendarView(req.user!.id, startDate, endDate);
      res.status(200).json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }
);

// --- Calendar Events ---

// GET /api/calendar/events - List events
calendarRouter.get(
  '/events',
  async (req: Request, res: Response<ApiResponse<CalendarEventDTO[]>>, next: NextFunction) => {
    try {
      const events = await calendarService.getCalendarEvents(
        req.user!.id,
        req.query.startDate as string,
        req.query.endDate as string
      );
      res.status(200).json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/calendar/events - Create event
calendarRouter.post(
  '/events',
  validateBody(createCalendarEventSchema),
  async (req: Request, res: Response<ApiResponse<CalendarEventDTO>>, next: NextFunction) => {
    try {
      const event = await calendarService.createCalendarEvent(req.user!.id, req.body);
      res.status(201).json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/calendar/events/:id - Update event
calendarRouter.put(
  '/events/:id',
  validateBody(updateCalendarEventSchema),
  async (req: Request, res: Response<ApiResponse<CalendarEventDTO>>, next: NextFunction) => {
    try {
      const updated = await calendarService.updateCalendarEvent(
        req.user!.id,
        req.params.id,
        req.body
      );
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'EVENT_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/calendar/events/:id - Delete event
calendarRouter.delete(
  '/events/:id',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      await calendarService.deleteCalendarEvent(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: { message: 'Event deleted successfully' } });
    } catch (err: any) {
      if (err.code === 'EVENT_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// --- Calendar Exceptions ---

// GET /api/calendar/exceptions - List exceptions
calendarRouter.get(
  '/exceptions',
  async (req: Request, res: Response<ApiResponse<CalendarExceptionDTO[]>>, next: NextFunction) => {
    try {
      const exceptions = await calendarService.getCalendarExceptions(
        req.user!.id,
        req.query.startDate as string,
        req.query.endDate as string
      );
      res.status(200).json({ success: true, data: exceptions });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/calendar/exceptions - Create exception
calendarRouter.post(
  '/exceptions',
  validateBody(createCalendarExceptionSchema),
  async (req: Request, res: Response<ApiResponse<CalendarExceptionDTO>>, next: NextFunction) => {
    try {
      const exception = await calendarService.createCalendarException(req.user!.id, req.body);
      res.status(201).json({ success: true, data: exception });
    } catch (err: any) {
      if (err.code === 'SESSION_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/calendar/exceptions/:id - Update exception
calendarRouter.put(
  '/exceptions/:id',
  validateBody(updateCalendarExceptionSchema),
  async (req: Request, res: Response<ApiResponse<CalendarExceptionDTO>>, next: NextFunction) => {
    try {
      const updated = await calendarService.updateCalendarException(
        req.user!.id,
        req.params.id,
        req.body
      );
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'EXCEPTION_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/calendar/exceptions/:id - Delete exception
calendarRouter.delete(
  '/exceptions/:id',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      await calendarService.deleteCalendarException(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: { message: 'Exception deleted successfully' } });
    } catch (err: any) {
      if (err.code === 'EXCEPTION_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);
