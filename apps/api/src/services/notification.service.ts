import * as webpushModule from 'web-push';
const webpush: any = (webpushModule as any).default || webpushModule;
import { prisma } from '../db';
import {
  CreatePushSubscriptionInput,
  PushSubscriptionDTO,
  NotificationDTO,
  NotificationFilterInput,
  NotificationPreferencesDTO,
  UpdateNotificationPreferencesInput,
  NotificationType,
} from '@tempo/shared';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '../config';
import { enqueueNotificationDelivery } from '../queue';

// Configure Web Push VAPID credentials
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err: any) {
  // eslint-disable-next-line no-console
  console.warn(`[WebPush] VAPID configuration error: ${err.message}`);
}

export class NotificationService {
  /**
   * Registers or updates a Web Push subscription for the authenticated user.
   */
  async subscribe(
    userId: string,
    input: CreatePushSubscriptionInput
  ): Promise<PushSubscriptionDTO> {
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: input.endpoint },
    });

    let subscription;
    if (existing) {
      subscription = await prisma.pushSubscription.update({
        where: { endpoint: input.endpoint },
        data: {
          userId, // Transfer ownership if on shared browser
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          expirationTime: input.expirationTime ? new Date(input.expirationTime) : null,
        },
      });
    } else {
      subscription = await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          expirationTime: input.expirationTime ? new Date(input.expirationTime) : null,
        },
      });
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime?.toISOString() || null,
      createdAt: subscription.createdAt.toISOString(),
    };
  }

  /**
   * Removes a Web Push subscription for the user.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<{ success: boolean }> {
    const subscription = await prisma.pushSubscription.findFirst({
      where: { userId, endpoint },
    });

    if (subscription) {
      await prisma.pushSubscription.delete({
        where: { id: subscription.id },
      });
    }

    return { success: true };
  }

  /**
   * Retrieves all active subscriptions for the user.
   */
  async getSubscriptions(userId: string): Promise<PushSubscriptionDTO[]> {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return subs.map((s: any) => ({
      id: s.id,
      userId: s.userId,
      endpoint: s.endpoint,
      expirationTime: s.expirationTime?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  /**
   * Retrieves notification preferences for the user.
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesDTO> {
    const pref = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      return {
        pushNotificationsEnabled: true,
        autoNightlyPlanningEnabled: true,
        notifyTomorrowPlanReady: true,
        notifyTaskReminders: true,
        notifyScheduleReminders: true,
        notifyScheduleChanges: true,
        preferredPlanningTime: '21:00',
      };
    }

    return {
      pushNotificationsEnabled: pref.pushNotificationsEnabled,
      autoNightlyPlanningEnabled: pref.autoNightlyPlanningEnabled,
      notifyTomorrowPlanReady: pref.notifyTomorrowPlanReady,
      notifyTaskReminders: pref.notifyTaskReminders,
      notifyScheduleReminders: pref.notifyScheduleReminders,
      notifyScheduleChanges: pref.notifyScheduleChanges,
      preferredPlanningTime: pref.preferredPlanningTime,
    };
  }

  /**
   * Updates notification preferences.
   */
  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferencesDTO> {
    const updated = await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        pushNotificationsEnabled: input.pushNotificationsEnabled ?? true,
        autoNightlyPlanningEnabled: input.autoNightlyPlanningEnabled ?? true,
        notifyTomorrowPlanReady: input.notifyTomorrowPlanReady ?? true,
        notifyTaskReminders: input.notifyTaskReminders ?? true,
        notifyScheduleReminders: input.notifyScheduleReminders ?? true,
        notifyScheduleChanges: input.notifyScheduleChanges ?? true,
        preferredPlanningTime: input.preferredPlanningTime ?? '21:00',
      },
      update: {
        ...(input.pushNotificationsEnabled !== undefined && {
          pushNotificationsEnabled: input.pushNotificationsEnabled,
        }),
        ...(input.autoNightlyPlanningEnabled !== undefined && {
          autoNightlyPlanningEnabled: input.autoNightlyPlanningEnabled,
        }),
        ...(input.notifyTomorrowPlanReady !== undefined && {
          notifyTomorrowPlanReady: input.notifyTomorrowPlanReady,
        }),
        ...(input.notifyTaskReminders !== undefined && {
          notifyTaskReminders: input.notifyTaskReminders,
        }),
        ...(input.notifyScheduleReminders !== undefined && {
          notifyScheduleReminders: input.notifyScheduleReminders,
        }),
        ...(input.notifyScheduleChanges !== undefined && {
          notifyScheduleChanges: input.notifyScheduleChanges,
        }),
        ...(input.preferredPlanningTime !== undefined && {
          preferredPlanningTime: input.preferredPlanningTime,
        }),
      },
    });

    return {
      pushNotificationsEnabled: updated.pushNotificationsEnabled,
      autoNightlyPlanningEnabled: updated.autoNightlyPlanningEnabled,
      notifyTomorrowPlanReady: updated.notifyTomorrowPlanReady,
      notifyTaskReminders: updated.notifyTaskReminders,
      notifyScheduleReminders: updated.notifyScheduleReminders,
      notifyScheduleChanges: updated.notifyScheduleChanges,
      preferredPlanningTime: updated.preferredPlanningTime,
    };
  }

  /**
   * Creates a notification record and dispatches delivery if permitted by user preferences.
   */
  async createNotification(
    userId: string,
    params: {
      type: NotificationType;
      title: string;
      body: string;
      data?: Record<string, any>;
    }
  ): Promise<NotificationDTO | null> {
    const prefs = await this.getPreferences(userId);

    // Verify category preference
    let allowed = true;
    if (params.type === 'TOMORROW_PLAN_READY' && !prefs.notifyTomorrowPlanReady) allowed = false;
    if (params.type === 'TASK_REMINDER' && !prefs.notifyTaskReminders) allowed = false;
    if (params.type === 'SCHEDULE_REMINDER' && !prefs.notifyScheduleReminders) allowed = false;
    if (params.type === 'SCHEDULE_CHANGE' && !prefs.notifyScheduleChanges) allowed = false;

    if (!allowed) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: params.type as any,
        title: params.title,
        body: params.body,
        data: params.data || null,
      },
    });

    // Enqueue delivery if user enabled push notifications
    if (prefs.pushNotificationsEnabled) {
      await enqueueNotificationDelivery(
        notification.id,
        userId,
        params.type,
        params.title,
        params.body,
        params.data
      );
    }

    return this.mapNotificationToDTO(notification);
  }

  /**
   * Delivers a Web Push notification to all active devices of the user.
   */
  async deliverNotification(notificationId: string): Promise<boolean> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) return false;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: notification.userId },
    });

    if (subscriptions.length === 0) {
      // Mark as delivered even if no push devices registered (stored in app notification center)
      await prisma.notification.update({
        where: { id: notificationId },
        data: { deliveredAt: new Date() },
      });
      return true;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      type: notification.type,
      data: notification.data || {},
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    });

    const expiredSubscriptionIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
        } catch (err: any) {
          // 404 Not Found or 410 Gone indicates the subscription expired or was revoked by browser
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredSubscriptionIds.push(sub.id);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredSubscriptionIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredSubscriptionIds } },
      });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { deliveredAt: new Date() },
    });

    return true;
  }

  /**
   * Lists notifications for the user with read/unread filtering.
   */
  async getNotifications(
    userId: string,
    filter: NotificationFilterInput
  ): Promise<{ notifications: NotificationDTO[]; unreadCount: number }> {
    const whereClause: any = { userId };
    if (filter.unreadOnly) {
      whereClause.readAt = null;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 50,
      }),
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      notifications: notifications.map(this.mapNotificationToDTO),
      unreadCount,
    };
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(userId: string, id: string): Promise<NotificationDTO> {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      const err: any = new Error('Notification not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return this.mapNotificationToDTO(updated);
  }

  /**
   * Marks all unread notifications as read.
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { success: true, count: result.count };
  }

  /**
   * Deletes a notification record.
   */
  async deleteNotification(userId: string, id: string): Promise<{ success: boolean }> {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      const err: any = new Error('Notification not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.notification.delete({
      where: { id },
    });

    return { success: true };
  }

  private mapNotificationToDTO(n: any): NotificationDTO {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: (n.data as any) || null,
      readAt: n.readAt?.toISOString() || null,
      deliveredAt: n.deliveredAt?.toISOString() || null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
