import { prisma } from '../db';
import { PlanningStatusDTO } from '@tempo/shared';
import { SchedulerService } from './scheduler.service';
import { NotificationService } from './notification.service';

export class NightlyPlanningService {
  private schedulerService = new SchedulerService();
  private notificationService = new NotificationService();

  /**
   * Calculates the user's local date and tomorrow's calendar date based on their timezone preference.
   */
  getUserLocalDates(timezone: string = 'Asia/Kolkata'): {
    localToday: string;
    localTomorrow: string;
  } {
    let tz = timezone;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      tz = 'Asia/Kolkata';
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const localToday = formatter.format(now);

    // Calculate tomorrow safely from noon UTC on localToday
    const dateObj = new Date(`${localToday}T12:00:00.000Z`);
    dateObj.setUTCDate(dateObj.getUTCDate() + 1);
    const localTomorrow = dateObj.toISOString().substring(0, 10);

    return { localToday, localTomorrow };
  }

  /**
   * Retrieves the current planning status for a user.
   */
  async getPlanningStatus(userId: string): Promise<PlanningStatusDTO> {
    const pref = await prisma.userPreference.findUnique({
      where: { userId },
    });

    const tz = pref?.timezone || 'Asia/Kolkata';
    const { localTomorrow } = this.getUserLocalDates(tz);

    const schedule = await prisma.schedule.findFirst({
      where: {
        userId,
        date: localTomorrow,
        status: { in: ['CONFIRMED', 'PROPOSED'] },
      },
      orderBy: { status: 'asc' }, // CONFIRMED before PROPOSED
    });

    let tomorrowPlanStatus: 'READY' | 'CONFIRMED' | 'NO_TASKS' | 'NOT_STARTED' = 'NOT_STARTED';

    if (schedule?.status === 'CONFIRMED') {
      tomorrowPlanStatus = 'CONFIRMED';
    } else if (schedule?.status === 'PROPOSED') {
      tomorrowPlanStatus = 'READY';
    } else {
      // Check if there are tasks or commitments available
      const activeTasksCount = await prisma.task.count({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      });
      if (activeTasksCount === 0) {
        tomorrowPlanStatus = 'NO_TASKS';
      }
    }

    return {
      autoPlanningEnabled: pref?.autoNightlyPlanningEnabled ?? true,
      preferredPlanningTime: pref?.preferredPlanningTime || '21:00',
      tomorrowDate: localTomorrow,
      tomorrowPlanStatus,
      scheduleId: schedule?.id || null,
      lastPlannedAt: schedule?.createdAt.toISOString() || null,
    };
  }

  /**
   * Executes nightly planning for a specific user.
   * Ensures idempotency and strict protection of existing confirmed schedules.
   */
  async executePlanningForUser(
    userId: string,
    options: {
      targetDate?: string;
      forceRegenerate?: boolean;
      isManualTrigger?: boolean;
    } = {}
  ): Promise<{
    status: 'READY' | 'CONFIRMED' | 'NO_TASKS' | 'SKIPPED_DISABLED';
    scheduleId?: string;
    message: string;
  }> {
    const pref = await prisma.userPreference.findUnique({
      where: { userId },
    });

    // 1. Verify user preference unless manually triggered
    if (!options.isManualTrigger && pref && !pref.autoNightlyPlanningEnabled) {
      return {
        status: 'SKIPPED_DISABLED',
        message: 'Automatic nightly planning is disabled in user preferences',
      };
    }

    const tz = pref?.timezone || 'Asia/Kolkata';
    const targetDate = options.targetDate || this.getUserLocalDates(tz).localTomorrow;

    // 2. Protect existing confirmed schedule - NEVER overwrite!
    const confirmedSchedule = await prisma.schedule.findFirst({
      where: {
        userId,
        date: targetDate,
        status: 'CONFIRMED',
      },
    });

    if (confirmedSchedule) {
      return {
        status: 'CONFIRMED',
        scheduleId: confirmedSchedule.id,
        message: 'Confirmed schedule already exists for this date and is preserved',
      };
    }

    // 3. Check for existing proposed schedule
    const existingProposed = await prisma.schedule.findFirst({
      where: {
        userId,
        date: targetDate,
        status: 'PROPOSED',
      },
    });

    if (existingProposed && !options.forceRegenerate) {
      return {
        status: 'READY',
        scheduleId: existingProposed.id,
        message: 'Proposed schedule already prepared for this date',
      };
    }

    // 4. Check for eligible tasks, college timetable sessions, or calendar events
    const dayOfWeek = new Date(`${targetDate}T12:00:00.000Z`).getUTCDay();

    const [activeTasksCount, timetableSessionsCount, eventsCount] = await Promise.all([
      prisma.task.count({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      }),
      prisma.timetableSession.count({
        where: { userId, dayOfWeek },
      }),
      prisma.calendarEvent.count({
        where: {
          userId,
          startTime: {
            gte: new Date(`${targetDate}T00:00:00.000Z`),
            lte: new Date(`${targetDate}T23:59:59.999Z`),
          },
        },
      }),
    ]);

    if (activeTasksCount === 0 && timetableSessionsCount === 0 && eventsCount === 0) {
      return {
        status: 'NO_TASKS',
        message: 'No active tasks, timetable classes or events found for this date',
      };
    }

    // 5. Generate proposed schedule using deterministic scheduler
    const scheduleDTO = await this.schedulerService.generateSchedule(userId, {
      targetDate,
      replaceConfirmed: false,
    });

    // 6. Send notification that tomorrow's plan is ready
    await this.notificationService.createNotification(userId, {
      type: 'TOMORROW_PLAN_READY',
      title: "Tomorrow's Plan is Ready",
      body: `Tempo has prepared your proposed schedule for ${targetDate}. Review and confirm when ready.`,
      data: {
        url: '/schedule',
        targetDate,
        scheduleId: scheduleDTO.id,
      },
    });

    return {
      status: 'READY',
      scheduleId: scheduleDTO.id,
      message: 'Proposed schedule successfully generated and notification queued',
    };
  }

  /**
   * Nightly planning batch processor for all eligible users.
   */
  async processAllEligibleUsers(): Promise<{
    processed: number;
    generated: number;
    skipped: number;
  }> {
    const users = await prisma.user.findMany({
      include: { preference: true },
    });

    let processed = 0;
    let generated = 0;
    let skipped = 0;

    for (const user of users) {
      processed++;
      try {
        const result = await this.executePlanningForUser(user.id, { isManualTrigger: false });
        if (result.status === 'READY') generated++;
        else skipped++;
      } catch (err: any) {
        skipped++;
        // eslint-disable-next-line no-console
        console.error(`[NightlyPlanning] Failed for user ${user.id}: ${err.message}`);
      }
    }

    return { processed, generated, skipped };
  }
}
