import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  taskFilterSchema,
  ApiResponse,
  TaskItemDTO,
} from '@tempo/shared';
import * as taskService from '../services/task.service';

export const taskRouter: Router = Router();

taskRouter.use(requireAuth);

// GET /api/tasks/overview - Overview statistics
taskRouter.get(
  '/overview',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const overview = await taskService.getTaskOverview(req.user!.id);
      res.status(200).json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/tasks - List, filter, sort and paginate tasks
taskRouter.get(
  '/',
  async (
    req: Request,
    res: Response<
      ApiResponse<{ tasks: TaskItemDTO[]; total: number; page: number; totalPages: number }>
    >,
    next: NextFunction
  ) => {
    try {
      const parsedFilter = taskFilterSchema.parse(req.query);
      const result = await taskService.getTasks(req.user!.id, parsedFilter);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query filters',
            details: err.errors,
          },
        });
        return;
      }
      next(err);
    }
  }
);

// GET /api/tasks/:id - Retrieve task details
taskRouter.get(
  '/:id',
  async (req: Request, res: Response<ApiResponse<TaskItemDTO>>, next: NextFunction) => {
    try {
      const task = await taskService.getTaskById(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: task });
    } catch (err: any) {
      if (err.code === 'TASK_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// POST /api/tasks - Create task
taskRouter.post(
  '/',
  validateBody(createTaskSchema),
  async (req: Request, res: Response<ApiResponse<TaskItemDTO>>, next: NextFunction) => {
    try {
      const task = await taskService.createTask(req.user!.id, req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err: any) {
      if (err.code === 'CATEGORY_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/tasks/:id - Update task
taskRouter.put(
  '/:id',
  validateBody(updateTaskSchema),
  async (req: Request, res: Response<ApiResponse<TaskItemDTO>>, next: NextFunction) => {
    try {
      const updated = await taskService.updateTask(req.user!.id, req.params.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'TASK_NOT_FOUND' || err.code === 'CATEGORY_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

const statusPatchSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'SKIPPED']),
});

// PATCH /api/tasks/:id/status - Quick status change
taskRouter.patch(
  '/:id/status',
  validateBody(statusPatchSchema),
  async (req: Request, res: Response<ApiResponse<TaskItemDTO>>, next: NextFunction) => {
    try {
      const updated = await taskService.updateTask(req.user!.id, req.params.id, {
        status: req.body.status,
      });
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'TASK_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/tasks/:id - Delete task
taskRouter.delete('/:id', async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  try {
    await taskService.deleteTask(req.user!.id, req.params.id);
    res.status(200).json({ success: true, data: { message: 'Task deleted successfully' } });
  } catch (err: any) {
    if (err.code === 'TASK_NOT_FOUND') {
      res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
      return;
    }
    next(err);
  }
});
