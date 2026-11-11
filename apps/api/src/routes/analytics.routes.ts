import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  ApiResponse,
  PlannedVsActualSummaryDTO,
  ProductivityHeatmapDTO,
  ProductivityAnalyticsDTO,
} from '@tempo/shared';
import { AnalyticsService } from '../services/analytics.service';

export const analyticsRouter: Router = Router();
const analyticsService = new AnalyticsService();

analyticsRouter.use(requireAuth);

// GET /api/analytics/planned-vs-actual - Compares planned schedule blocks against actual recorded activity
analyticsRouter.get(
  '/planned-vs-actual',
  async (
    req: Request,
    res: Response<ApiResponse<PlannedVsActualSummaryDTO>>,
    next: NextFunction
  ) => {
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      const date = (req.query.date as string) || todayStr;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Date must be formatted as YYYY-MM-DD',
          },
        });
        return;
      }

      const summary = await analyticsService.getPlannedVsActual(req.user!.id, date);
      res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/analytics/heatmap - 365-day productivity heatmap
analyticsRouter.get(
  '/heatmap',
  async (req: Request, res: Response<ApiResponse<ProductivityHeatmapDTO>>, next: NextFunction) => {
    try {
      const heatmap = await analyticsService.getProductivityHeatmap(req.user!.id);
      res.status(200).json({ success: true, data: heatmap });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/analytics/summary - Weekly or monthly analytics summary and trends
analyticsRouter.get(
  '/summary',
  async (
    req: Request,
    res: Response<ApiResponse<ProductivityAnalyticsDTO>>,
    next: NextFunction
  ) => {
    try {
      const periodParam = req.query.period as string;
      const period: 'week' | 'month' = periodParam === 'month' ? 'month' : 'week';

      const analytics = await analyticsService.getProductivityAnalytics(req.user!.id, period);
      res.status(200).json({ success: true, data: analytics });
    } catch (err) {
      next(err);
    }
  }
);
