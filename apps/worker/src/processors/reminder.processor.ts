import { Job } from 'bullmq';
import { ScheduleReminderJobPayload, TaskReminderJobPayload } from '@tempo/shared';
import { prisma } from '@tempo/database';

export async function processScheduleReminderJob(
  job: Job<ScheduleReminderJobPayload>
): Promise<any> {
  const { userId, scheduleBlockId, title, scheduledTime } = job.data;
  // eslint-disable-next-line no-console
  console.log(`[Worker] [Reminder] Processing schedule reminder for block=${scheduleBlockId}`);

  const pref = await prisma.userPreference.findUnique({ where: { userId } });
  if (pref && !pref.notifyScheduleReminders) {
    return { skipped: true, reason: 'PREFERENCE_DISABLED' };
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: 'SCHEDULE_REMINDER',
      title: 'Upcoming Scheduled Activity',
      body: `"${title}" is scheduled to begin at ${scheduledTime}.`,
      data: { scheduleBlockId, url: '/schedule' },
    },
  });

  return { notificationId: notification.id };
}

export async function processTaskReminderJob(job: Job<TaskReminderJobPayload>): Promise<any> {
  const { userId, taskId, title, dueDate } = job.data;
  // eslint-disable-next-line no-console
  console.log(`[Worker] [Reminder] Processing task reminder for task=${taskId}`);

  const pref = await prisma.userPreference.findUnique({ where: { userId } });
  if (pref && !pref.notifyTaskReminders) {
    return { skipped: true, reason: 'PREFERENCE_DISABLED' };
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: 'TASK_REMINDER',
      title: 'Task Due Reminder',
      body: `"${title}" deadline is approaching (${dueDate}).`,
      data: { taskId, url: '/tasks' },
    },
  });

  return { notificationId: notification.id };
}
