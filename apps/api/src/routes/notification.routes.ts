import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createPushSubscriptionSchema,
  deletePushSubscriptionSchema,
  notificationFilterSchema,
  updateNotificationPreferencesSchema,
  ApiResponse,
  PushSubscriptionDTO,
  NotificationDTO,
  NotificationPreferencesDTO,
} from '@tempo/shared';
import { NotificationService } from '../services/notification.service';
import { VAPID_PUBLIC_KEY } from '../config';

export const notificationRouter: Router = Router();
const notificationService = new NotificationService();

// Require authentication for all notification routes except public VAPID key
notificationRouter.get(
  '/vapid-public-key',
  (_req: Request, res: Response<ApiResponse<{ publicKey: string }>>) => {
    res.status(200).json({
      success: true,
      data: { publicKey: VAPID_PUBLIC_KEY },
    });
  }
);

notificationRouter.use(requireAuth);

// POST /api/notifications/subscribe - Register or update a push subscription
notificationRouter.post(
  '/subscribe',
  validateBody(createPushSubscriptionSchema),
  async (req: Request, res: Response<ApiResponse<PushSubscriptionDTO>>, next: NextFunction) => {
    try {
      const subscription = await notificationService.subscribe(req.user!.id, req.body);
      res.status(201).json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/notifications/subscribe - Remove a push subscription
notificationRouter.delete(
  '/subscribe',
  validateBody(deletePushSubscriptionSchema),
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const result = await notificationService.unsubscribe(req.user!.id, req.body.endpoint);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/notifications/subscriptions - List active subscriptions for user
notificationRouter.get(
  '/subscriptions',
  async (req: Request, res: Response<ApiResponse<PushSubscriptionDTO[]>>, next: NextFunction) => {
    try {
      const subscriptions = await notificationService.getSubscriptions(req.user!.id);
      res.status(200).json({ success: true, data: subscriptions });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/notifications - List user notifications with unread count
notificationRouter.get(
  '/',
  async (
    req: Request,
    res: Response<ApiResponse<{ notifications: NotificationDTO[]; unreadCount: number }>>,
    next: NextFunction
  ) => {
    try {
      const parsedFilter = notificationFilterSchema.parse(req.query);
      const result = await notificationService.getNotifications(req.user!.id, parsedFilter);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query filters' },
        });
        return;
      }
      next(err);
    }
  }
);

// PATCH /api/notifications/:id/read - Mark single notification as read
notificationRouter.patch(
  '/:id/read',
  async (req: Request, res: Response<ApiResponse<NotificationDTO>>, next: NextFunction) => {
    try {
      const updated = await notificationService.markAsRead(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

// POST /api/notifications/read-all - Mark all notifications as read
notificationRouter.post(
  '/read-all',
  async (req: Request, res: Response<ApiResponse<{ count: number }>>, next: NextFunction) => {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/notifications/:id - Delete a notification
notificationRouter.delete(
  '/:id',
  async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    try {
      const result = await notificationService.deleteNotification(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

// GET /api/notifications/preferences - Retrieve notification preferences
notificationRouter.get(
  '/preferences',
  async (
    req: Request,
    res: Response<ApiResponse<NotificationPreferencesDTO>>,
    next: NextFunction
  ) => {
    try {
      const prefs = await notificationService.getPreferences(req.user!.id);
      res.status(200).json({ success: true, data: prefs });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/notifications/preferences - Update notification preferences
notificationRouter.put(
  '/preferences',
  validateBody(updateNotificationPreferencesSchema),
  async (
    req: Request,
    res: Response<ApiResponse<NotificationPreferencesDTO>>,
    next: NextFunction
  ) => {
    try {
      const updated = await notificationService.updatePreferences(req.user!.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);
