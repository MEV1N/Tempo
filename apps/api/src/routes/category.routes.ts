import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  ApiResponse,
  TaskCategoryDTO,
} from '@tempo/shared';
import * as categoryService from '../services/category.service';

export const categoryRouter: Router = Router();

// All routes require authentication
categoryRouter.use(requireAuth);

// GET /api/categories - List user categories
categoryRouter.get(
  '/',
  async (req: Request, res: Response<ApiResponse<TaskCategoryDTO[]>>, next: NextFunction) => {
    try {
      const categories = await categoryService.getCategories(req.user!.id);
      res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/categories - Create category
categoryRouter.post(
  '/',
  validateBody(createCategorySchema),
  async (req: Request, res: Response<ApiResponse<TaskCategoryDTO>>, next: NextFunction) => {
    try {
      const category = await categoryService.createCategory(req.user!.id, req.body);
      res.status(201).json({ success: true, data: category });
    } catch (err: any) {
      if (err.code === 'CATEGORY_ALREADY_EXISTS') {
        res.status(409).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

// PUT /api/categories/:id - Update category
categoryRouter.put(
  '/:id',
  validateBody(updateCategorySchema),
  async (req: Request, res: Response<ApiResponse<TaskCategoryDTO>>, next: NextFunction) => {
    try {
      const updated = await categoryService.updateCategory(req.user!.id, req.params.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'CATEGORY_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      if (err.code === 'CATEGORY_ALREADY_EXISTS') {
        res.status(409).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/categories/:id - Delete category
categoryRouter.delete(
  '/:id',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      await categoryService.deleteCategory(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: { message: 'Category deleted successfully' } });
    } catch (err: any) {
      if (err.code === 'CATEGORY_NOT_FOUND') {
        res.status(404).json({ success: false, error: { code: err.code, message: err.message } });
        return;
      }
      next(err);
    }
  }
);
