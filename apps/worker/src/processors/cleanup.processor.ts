import { Job } from 'bullmq';
import { CleanupExpiredDataJobPayload } from '@tempo/shared';
import { prisma } from '@tempo/database';

export async function processCleanupExpiredDataJob(
  job: Job<CleanupExpiredDataJobPayload>
): Promise<any> {
  const { cutoffDate } = job.data;
  // eslint-disable-next-line no-console
  console.log(`[Worker] [Cleanup] Running data cleanup with cutoff=${cutoffDate}`);

  const cutoff = new Date(cutoffDate);

  // Clean up expired or revoked sessions
  const deletedSessions = await prisma.session.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
    },
  });

  // Clean up old read notifications
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      readAt: { lt: cutoff },
    },
  });

  // Clean up expired push subscriptions
  const deletedSubscriptions = await prisma.pushSubscription.deleteMany({
    where: {
      expirationTime: { lt: new Date() },
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `[Worker] [Cleanup] Completed: removed ${deletedSessions.count} sessions, ${deletedNotifications.count} notifications, ${deletedSubscriptions.count} subscriptions`
  );

  return {
    deletedSessions: deletedSessions.count,
    deletedNotifications: deletedNotifications.count,
    deletedSubscriptions: deletedSubscriptions.count,
  };
}
