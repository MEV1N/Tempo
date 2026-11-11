import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Worker, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES, JOB_NAMES, APP_CONFIG } from '@tempo/shared';
import { prisma } from '@tempo/database';
import { processNightlyPlanningJob } from './processors/planning.processor';
import { processNotificationDeliveryJob } from './processors/notification.processor';
import {
  processScheduleReminderJob,
  processTaskReminderJob,
} from './processors/reminder.processor';
import { processCleanupExpiredDataJob } from './processors/cleanup.processor';
import { processGoogleCalendarSyncJob } from './processors/calendar.processor';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// eslint-disable-next-line no-console
console.log(`===============================================`);
// eslint-disable-next-line no-console
console.log(`⚙️  Tempo Background Worker Starting`);
// eslint-disable-next-line no-console
console.log(`   Version: ${APP_CONFIG.VERSION}`);
// eslint-disable-next-line no-console
console.log(`   Redis: ${REDIS_URL.replace(/:\/\/.*@/, '://***@')}`);
// eslint-disable-next-line no-console
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
// eslint-disable-next-line no-console
console.log(`===============================================`);

let isRunning = true;
let redisConnection: IORedis | null = null;
let backgroundWorker: Worker | null = null;
let notificationWorker: Worker | null = null;

if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
  try {
    redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          // eslint-disable-next-line no-console
          console.warn(`[Worker] Redis connection retry limit reached. Standby mode active.`);
          return null;
        }
        return Math.min(times * 500, 2000);
      },
      lazyConnect: true,
    });

    redisConnection.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log(`[Worker] Connected to Redis queue server successfully`);
    });

    redisConnection.on('error', (_err) => {
      // Suppress unhandled rejection when Redis is not running locally
    });

    redisConnection
      .connect()
      .then(() => {
        const workerOptions: WorkerOptions = {
          connection: redisConnection!,
          concurrency: 5,
        };

        // 1. Background Jobs Worker
        backgroundWorker = new Worker(
          QUEUE_NAMES.BACKGROUND,
          async (job) => {
            switch (job.name) {
              case JOB_NAMES.NIGHTLY_PLANNING:
                return processNightlyPlanningJob(job);
              case JOB_NAMES.SCHEDULE_REMINDER:
                return processScheduleReminderJob(job);
              case JOB_NAMES.TASK_REMINDER:
                return processTaskReminderJob(job);
              case JOB_NAMES.CLEANUP_EXPIRED_DATA:
                return processCleanupExpiredDataJob(job);
              case JOB_NAMES.GOOGLE_CALENDAR_SYNC:
                return processGoogleCalendarSyncJob(job);
              default:
                // eslint-disable-next-line no-console
                console.warn(`[Worker] Unknown background job: ${job.name}`);
                return { error: 'UNKNOWN_JOB_TYPE' };
            }
          },
          workerOptions
        );

        backgroundWorker.on('completed', (job) => {
          // eslint-disable-next-line no-console
          console.log(`[Worker] Job ${job.id} (${job.name}) completed successfully`);
        });

        backgroundWorker.on('failed', (job, err) => {
          // eslint-disable-next-line no-console
          console.error(`[Worker] Job ${job?.id} (${job?.name}) failed: ${err.message}`);
        });

        // 2. Notification Delivery Worker
        notificationWorker = new Worker(
          QUEUE_NAMES.NOTIFICATIONS,
          async (job) => {
            if (job.name === JOB_NAMES.NOTIFICATION_DELIVERY) {
              return processNotificationDeliveryJob(job);
            }
            // eslint-disable-next-line no-console
            console.warn(`[Worker] Unknown notification job: ${job.name}`);
            return { error: 'UNKNOWN_JOB_TYPE' };
          },
          workerOptions
        );

        notificationWorker.on('completed', (job) => {
          // eslint-disable-next-line no-console
          console.log(`[Worker] Notification job ${job.id} completed successfully`);
        });

        notificationWorker.on('failed', (job, err) => {
          // eslint-disable-next-line no-console
          console.error(`[Worker] Notification job ${job?.id} failed: ${err.message}`);
        });
      })
      .catch(() => {
        // eslint-disable-next-line no-console
        console.warn(`[Worker] Redis server unreachable. Standby mode active.`);
      });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn(`[Worker] Queue initialization in offline standby: ${err.message}`);
  }
} else {
  // eslint-disable-next-line no-console
  console.log(`[Worker] Standby mode active (REDIS_URL not configured). Polling scheduler active.`);
}

/**
 * Periodic Nightly Planning Monitor
 * Checks users' local timezones every 60 seconds and initiates automatic schedule generation.
 */
const schedulerInterval = setInterval(async () => {
  if (!isRunning) return;
  try {
    const usersWithPref = await prisma.user.findMany({
      where: {
        preference: {
          autoNightlyPlanningEnabled: true,
        },
      },
      include: { preference: true },
    });

    const now = new Date();

    for (const u of usersWithPref) {
      if (!u.preference) continue;
      const tz = u.preference.timezone || 'Asia/Kolkata';

      let localTimeStr = '21:00';
      let localDateStr = '';
      try {
        const timeFmt = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        localTimeStr = timeFmt.format(now);

        const dateFmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        localDateStr = dateFmt.format(now);
      } catch {
        continue;
      }

      // Check if current local time matches user's preferred planning time
      const preferredTime = u.preference.preferredPlanningTime || '21:00';
      if (localTimeStr === preferredTime) {
        // Compute tomorrow's local date
        const tomObj = new Date(`${localDateStr}T12:00:00.000Z`);
        tomObj.setUTCDate(tomObj.getUTCDate() + 1);
        const tomorrowDate = tomObj.toISOString().substring(0, 10);

        // Check if schedule already exists for tomorrow
        const existingSchedule = await prisma.schedule.findFirst({
          where: { userId: u.id, date: tomorrowDate },
        });

        if (!existingSchedule) {
          // eslint-disable-next-line no-console
          console.log(
            `[Worker] [Trigger] Automatic nightly plan triggered for user=${u.id} (${tz}) targetDate=${tomorrowDate}`
          );
          // Directly invoke processor
          await processNightlyPlanningJob({
            data: { userId: u.id, targetDate: tomorrowDate },
          } as any);
        }
      }
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(`[Worker] [Scheduler] Check error: ${err.message}`);
  }
}, 60000);

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[Worker] Received ${signal}. Shutting down gracefully...`);
  isRunning = false;
  clearInterval(schedulerInterval);

  try {
    if (backgroundWorker) await backgroundWorker.close();
    if (notificationWorker) await notificationWorker.close();
    if (redisConnection) await redisConnection.quit();
    await prisma.$disconnect();
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(`[Worker] Error during shutdown: ${err.message}`);
  }

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
