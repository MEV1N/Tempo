import { Job } from 'bullmq';
import { NightlyPlanningJobPayload } from '@tempo/shared';
import { prisma } from '@tempo/database';

export async function processNightlyPlanningJob(job: Job<NightlyPlanningJobPayload>): Promise<any> {
  const { userId, targetDate, forceRegenerate } = job.data;
  // eslint-disable-next-line no-console
  console.log(
    `[Worker] [Planning] Starting nightly planning for user=${userId}, date=${targetDate}`
  );

  const pref = await prisma.userPreference.findUnique({
    where: { userId },
  });

  if (pref && !pref.autoNightlyPlanningEnabled && !forceRegenerate) {
    // eslint-disable-next-line no-console
    console.log(`[Worker] [Planning] Skipped: Auto-planning disabled for user=${userId}`);
    return { status: 'SKIPPED_DISABLED' };
  }

  // Check existing confirmed schedule - NEVER overwrite!
  const confirmed = await prisma.schedule.findFirst({
    where: { userId, date: targetDate, status: 'CONFIRMED' },
  });

  if (confirmed) {
    // eslint-disable-next-line no-console
    console.log(`[Worker] [Planning] Skipped: Confirmed schedule exists for user=${userId}`);
    return { status: 'CONFIRMED', scheduleId: confirmed.id };
  }

  // Check existing proposed
  const existingProposed = await prisma.schedule.findFirst({
    where: { userId, date: targetDate, status: 'PROPOSED' },
  });

  if (existingProposed && !forceRegenerate) {
    // eslint-disable-next-line no-console
    console.log(`[Worker] [Planning] Proposed schedule already exists for user=${userId}`);
    return { status: 'READY', scheduleId: existingProposed.id };
  }

  // Check if there are active tasks or sessions
  const dayOfWeek = new Date(`${targetDate}T12:00:00.000Z`).getUTCDay();
  const [tasksCount, timetableCount] = await Promise.all([
    prisma.task.count({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
    prisma.timetableSession.count({ where: { userId, dayOfWeek } }),
  ]);

  if (tasksCount === 0 && timetableCount === 0) {
    // eslint-disable-next-line no-console
    console.log(`[Worker] [Planning] No eligible tasks or classes for user=${userId}`);
    return { status: 'NO_TASKS' };
  }

  // We can create notification that plan is ready if user has enabled it
  if (pref?.notifyTomorrowPlanReady) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'TOMORROW_PLAN_READY',
        title: "Tomorrow's Plan is Ready",
        body: `Tempo has prepared your schedule for ${targetDate}. Review and confirm when ready.`,
        data: { url: '/schedule', targetDate },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`[Worker] [Planning] Completed nightly planning for user=${userId}`);
  return { status: 'READY' };
}
