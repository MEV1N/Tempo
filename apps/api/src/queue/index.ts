import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  NightlyPlanningJobPayload,
  NotificationDeliveryJobPayload,
  ScheduleReminderJobPayload,
  TaskReminderJobPayload,
  CleanupExpiredDataJobPayload,
} from '@tempo/shared';

let redisClient: IORedis | null = null;
let backgroundQueue: Queue | null = null;
let notificationQueue: Queue | null = null;
let isRedisAvailable = false;

// Only initialize Redis client if REDIS_URL is explicitly set and not in offline/test without redis
const redisUrl = process.env.REDIS_URL;

if (redisUrl && redisUrl.trim() !== '') {
  try {
    redisClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 2) {
          return null; // Stop reconnection spam if server is offline
        }
        return Math.min(times * 300, 1000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      // eslint-disable-next-line no-console
      console.log(`[Queue] Connected to Redis successfully`);
    });

    redisClient.on('error', (_err) => {
      isRedisAvailable = false;
    });

    // Attempt connection
    redisClient
      .connect()
      .then(() => {
        const queueOptions: QueueOptions = {
          connection: redisClient!,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        };

        backgroundQueue = new Queue(QUEUE_NAMES.BACKGROUND, queueOptions);
        notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, queueOptions);
      })
      .catch(() => {
        isRedisAvailable = false;
      });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn(`[Queue] Redis client initialization skipped: ${err.message}`);
  }
}

export { isRedisAvailable, backgroundQueue, notificationQueue };

/**
 * Enqueues a nightly planning job with deterministic job ID to prevent duplicate executions.
 */
export async function enqueueNightlyPlanning(
  userId: string,
  targetDate: string,
  forceRegenerate: boolean = false
): Promise<string | null> {
  const jobId = `nightly-plan-${userId}-${targetDate}${forceRegenerate ? `-${Date.now()}` : ''}`;
  const payload: NightlyPlanningJobPayload = { userId, targetDate, forceRegenerate };

  if (backgroundQueue && isRedisAvailable) {
    try {
      const job = await backgroundQueue.add(JOB_NAMES.NIGHTLY_PLANNING, payload, { jobId });
      return job.id || jobId;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(`[Queue] Could not enqueue nightly planning to Redis: ${err.message}`);
    }
  }
  return null;
}

/**
 * Enqueues a notification delivery job.
 */
export async function enqueueNotificationDelivery(
  notificationId: string,
  userId: string,
  type: any,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string | null> {
  const jobId = `notif-deliv-${notificationId}`;
  const payload: NotificationDeliveryJobPayload = {
    notificationId,
    userId,
    type,
    title,
    body,
    data,
  };

  if (notificationQueue && isRedisAvailable) {
    try {
      const job = await notificationQueue.add(JOB_NAMES.NOTIFICATION_DELIVERY, payload, { jobId });
      return job.id || jobId;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(`[Queue] Could not enqueue notification delivery to Redis: ${err.message}`);
    }
  }
  return null;
}

/**
 * Enqueues a schedule reminder job.
 */
export async function enqueueScheduleReminder(
  userId: string,
  scheduleBlockId: string,
  title: string,
  scheduledTime: string
): Promise<string | null> {
  const jobId = `remind-block-${scheduleBlockId}`;
  const payload: ScheduleReminderJobPayload = {
    userId,
    scheduleBlockId,
    title,
    scheduledTime,
  };

  if (backgroundQueue && isRedisAvailable) {
    try {
      const job = await backgroundQueue.add(JOB_NAMES.SCHEDULE_REMINDER, payload, { jobId });
      return job.id || jobId;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(`[Queue] Could not enqueue schedule reminder to Redis: ${err.message}`);
    }
  }
  return null;
}

/**
 * Enqueues a task reminder job.
 */
export async function enqueueTaskReminder(
  userId: string,
  taskId: string,
  title: string,
  dueDate: string
): Promise<string | null> {
  const jobId = `remind-task-${taskId}`;
  const payload: TaskReminderJobPayload = {
    userId,
    taskId,
    title,
    dueDate,
  };

  if (backgroundQueue && isRedisAvailable) {
    try {
      const job = await backgroundQueue.add(JOB_NAMES.TASK_REMINDER, payload, { jobId });
      return job.id || jobId;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(`[Queue] Could not enqueue task reminder to Redis: ${err.message}`);
    }
  }
  return null;
}

/**
 * Enqueues a cleanup job for expired notifications and sessions.
 */
export async function enqueueCleanupExpiredData(cutoffDate: string): Promise<string | null> {
  const jobId = `cleanup-${cutoffDate}`;
  const payload: CleanupExpiredDataJobPayload = { cutoffDate };

  if (backgroundQueue && isRedisAvailable) {
    try {
      const job = await backgroundQueue.add(JOB_NAMES.CLEANUP_EXPIRED_DATA, payload, { jobId });
      return job.id || jobId;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(`[Queue] Could not enqueue cleanup to Redis: ${err.message}`);
    }
  }
  return null;
}

/**
 * Closes Redis connections and queues gracefully.
 */
export async function closeQueues(): Promise<void> {
  if (backgroundQueue) await backgroundQueue.close().catch(() => {});
  if (notificationQueue) await notificationQueue.close().catch(() => {});
  if (redisClient) await redisClient.quit().catch(() => {});
}
