import { Job } from 'bullmq';
import { GoogleCalendarSyncJobPayload } from '@tempo/shared';
import { prisma } from '@tempo/database';

export async function processGoogleCalendarSyncJob(
  job: Job<GoogleCalendarSyncJobPayload>
): Promise<any> {
  const { userId, forceFullSync } = job.data;
  // eslint-disable-next-line no-console
  console.log(`[Worker] [CalendarSync] Starting calendar sync for user=${userId}`);

  const connection = await prisma.oAuthConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'google',
      },
    },
  });

  if (!connection || !connection.calendarConnected) {
    return { skipped: true, reason: 'CALENDAR_NOT_CONNECTED' };
  }

  // Update lastSyncedAt timestamp in worker
  await prisma.oAuthConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  });

  return { success: true, userId, forceFullSync: !!forceFullSync };
}
