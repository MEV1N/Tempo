import { Job } from 'bullmq';
import * as webpushModule from 'web-push';
const webpush: any = (webpushModule as any).default || webpushModule;
import { NotificationDeliveryJobPayload } from '@tempo/shared';
import { prisma } from '@tempo/database';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BFuWlJhM3yCsY8c26RwMoqviRmWi8dtwZKMTM585qIGOQt7CPhYlyaFg7_lb7WERJal-PnEIh0qpKtRzW0c52RE';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'u4uF-o_szZ93TN8VuuMiMT36zRdr3rHJHe4vWrQOQGI';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@tempo.app';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err: any) {
  // eslint-disable-next-line no-console
  console.warn(`[Worker] [Push] VAPID configuration error: ${err.message}`);
}

export async function processNotificationDeliveryJob(
  job: Job<NotificationDeliveryJobPayload>
): Promise<any> {
  const { notificationId, userId, title, body, type, data } = job.data;
  // eslint-disable-next-line no-console
  console.log(
    `[Worker] [Push] Processing delivery for notification=${notificationId}, user=${userId}`
  );

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[Worker] [Push] No push subscriptions found for user=${userId}. Marked delivered.`
    );
    await prisma.notification.update({
      where: { id: notificationId },
      data: { deliveredAt: new Date() },
    });
    return { delivered: true, subscriptionCount: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    type,
    data: data || {},
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  });

  const expiredIds: string[] = [];
  let successfulSends = 0;

  for (const sub of subscriptions) {
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
      successfulSends++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        expiredIds.push(sub.id);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[Worker] [Push] Send failed for endpoint ${sub.endpoint}: ${err.message}`);
      }
    }
  }

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } },
    });
    // eslint-disable-next-line no-console
    console.log(`[Worker] [Push] Cleaned up ${expiredIds.length} expired subscription(s)`);
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { deliveredAt: new Date() },
  });

  // eslint-disable-next-line no-console
  console.log(
    `[Worker] [Push] Delivered notification=${notificationId} to ${successfulSends} device(s)`
  );
  return { delivered: true, successfulSends };
}
