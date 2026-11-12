import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  PersonalRoutineDTO,
  createRoutineSchema,
  updateRoutineSchema,
  copyRoutinesSchema,
} from '@tempo/shared';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { routineService } from '../services/routine.service';

export const routineRouter: Router = Router();

// GET /api/routines
routineRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PersonalRoutineDTO[]>>) => {
    try {
      const dayOfWeek = req.query.dayOfWeek
        ? parseInt(req.query.dayOfWeek as string, 10)
        : undefined;
      const category = req.query.category ? (req.query.category as string) : undefined;
      const isEnabled =
        req.query.isEnabled !== undefined ? req.query.isEnabled === 'true' : undefined;

      const routines = await routineService.getRoutines(req.user!.id, {
        dayOfWeek,
        category,
        isEnabled,
      });

      res.status(200).json({
        success: true,
        data: routines,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'FETCH_ROUTINES_FAILED',
          message: err.message || 'Failed to fetch personal routines',
        },
      });
    }
  }
);

// POST /api/routines
routineRouter.post(
  '/',
  requireAuth,
  validateBody(createRoutineSchema),
  async (req: Request, res: Response<ApiResponse<PersonalRoutineDTO>>) => {
    try {
      const routine = await routineService.createRoutine(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: routine,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'CREATE_ROUTINE_FAILED',
          message: err.message || 'Failed to create personal routine',
        },
      });
    }
  }
);

// POST /api/routines/defaults - Seed default starter routines
routineRouter.post(
  '/defaults',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PersonalRoutineDTO[]>>) => {
    try {
      const routines = await routineService.seedDefaultRoutines(req.user!.id);
      res.status(201).json({
        success: true,
        data: routines,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'SEED_ROUTINES_FAILED',
          message: err.message || 'Failed to seed default routines',
        },
      });
    }
  }
);

// POST /api/routines/copy - Copy routines from one weekday to other weekdays
routineRouter.post(
  '/copy',
  requireAuth,
  validateBody(copyRoutinesSchema),
  async (
    req: Request,
    res: Response<ApiResponse<{ count: number; routines: PersonalRoutineDTO[] }>>
  ) => {
    try {
      const result = await routineService.copyRoutines(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'COPY_ROUTINES_FAILED',
          message: err.message || 'Failed to copy personal routines',
        },
      });
    }
  }
);

// GET /api/routines/:id
routineRouter.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PersonalRoutineDTO>>) => {
    try {
      const routine = await routineService.getRoutineById(req.user!.id, req.params.id);
      res.status(200).json({
        success: true,
        data: routine,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'FETCH_ROUTINE_FAILED',
          message: err.message || 'Failed to fetch personal routine',
        },
      });
    }
  }
);

// PATCH /api/routines/:id
routineRouter.patch(
  '/:id',
  requireAuth,
  validateBody(updateRoutineSchema),
  async (req: Request, res: Response<ApiResponse<PersonalRoutineDTO>>) => {
    try {
      const updated = await routineService.updateRoutine(req.user!.id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'UPDATE_ROUTINE_FAILED',
          message: err.message || 'Failed to update personal routine',
        },
      });
    }
  }
);

// DELETE /api/routines/:id
routineRouter.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<{ deleted: boolean }>>) => {
    try {
      const result = await routineService.deleteRoutine(req.user!.id, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'DELETE_ROUTINE_FAILED',
          message: err.message || 'Failed to delete personal routine',
        },
      });
    }
  }
);
