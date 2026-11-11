import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '@tempo/shared';

export const validateBody =
  (schema: ZodSchema) =>
  async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issues[0]?.message || 'Invalid input data',
            details: issues,
          },
        });
        return;
      }
      next(error);
    }
  };
