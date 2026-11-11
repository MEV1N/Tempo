import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { HealthCheckResponse, ApiResponse, APP_CONFIG } from '@tempo/shared';
import { CORS_ORIGIN } from './config';
import { csrfProtection } from './middleware/csrf';
import { authRouter } from './routes/auth.routes';
import { preferenceRouter } from './routes/preference.routes';
import { profileRouter } from './routes/profile.routes';
import { categoryRouter } from './routes/category.routes';
import { taskRouter } from './routes/task.routes';
import { recurrenceRouter } from './routes/recurrence.routes';
import { timetableRouter } from './routes/timetable.routes';
import { calendarRouter } from './routes/calendar.routes';
import schedulerRouter from './routes/scheduler.routes';
import { activityRouter } from './routes/activity.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { notificationRouter } from './routes/notification.routes';
import { planningRouter } from './routes/planning.routes';
import { googleAuthRouter } from './routes/google-auth.routes';
import { googleCalendarRouter } from './routes/google-calendar.routes';

export function createApp(): Express {
  const app: Express = express();

  // Trust proxy for rate limiting behind reverse proxies / test environments
  app.set('trust proxy', 1);

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === CORS_ORIGIN ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in local dev
      },
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        APP_CONFIG.CSRF_HEADER_NAME,
        'x-requested-with',
      ],
    })
  );

  // Cookie Parser & Body Parsers
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CSRF Protection
  app.use(csrfProtection);

  // Request logger in non-test mode
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'test') {
      const timestamp = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(`[${timestamp}] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check endpoint handler
  const healthHandler = (_req: Request, res: Response<HealthCheckResponse>) => {
    res.status(200).json({
      status: 'ok',
      service: 'tempo-api',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: APP_CONFIG.VERSION,
    });
  };

  // Register health endpoints (Phase 0)
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Root welcome route
  app.get(
    '/',
    (_req: Request, res: Response<ApiResponse<{ message: string; version: string }>>) => {
      res.status(200).json({
        success: true,
        data: {
          message: 'Tempo API Service is running (Phase 1)',
          version: APP_CONFIG.VERSION,
        },
      });
    }
  );

  // API Routes (Phase 1 & Phase 2)
  app.use('/api/auth', authRouter);
  app.use('/api/preferences', preferenceRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api/recurring-tasks', recurrenceRouter);
  app.use('/api/timetables', timetableRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/schedule', schedulerRouter);
  app.use('/api/activities', activityRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/planning', planningRouter);
  app.use('/api/auth/google', googleAuthRouter);
  app.use('/api/google-calendar', googleCalendarRouter);

  // 404 Handler
  app.use((_req: Request, res: Response<ApiResponse>) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found on Tempo API',
      },
    });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response<ApiResponse>, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
      },
    });
  });

  return app;
}
