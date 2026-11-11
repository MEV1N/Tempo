import { SchedulerRequest, TimeInterval, ScheduledBlockOutput } from './types';
import { timeToMinutes, minutesToTime, subtractIntervals, mergeIntervals } from './intervals';

export interface AvailabilityResult {
  wakeMinute: number;
  sleepMinute: number;
  wakingInterval: TimeInterval;
  fixedBlocks: ScheduledBlockOutput[];
  mealBlocks: ScheduledBlockOutput[];
  occupiedIntervals: TimeInterval[];
  availableIntervals: TimeInterval[];
}

/**
 * Calculates the day of week number (1 = Monday, ..., 7 = Sunday) for a YYYY-MM-DD date string.
 * This is deterministic and independent of local timezone drift.
 */
export function getDayOfWeekFromDate(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const jsDay = d.getUTCDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Calculates availability for the specified date, user preferences, and calendar context.
 */
export function calculateAvailability(request: SchedulerRequest): AvailabilityResult {
  const { preferences, targetDate, calendarContext, fixedCommitments, options } = request;

  const wakeMinute = timeToMinutes(preferences.wakeTime || '07:00');
  let sleepMinute = timeToMinutes(preferences.sleepTime || '23:00');

  // Guard against invalid sleep time
  if (sleepMinute <= wakeMinute) {
    sleepMinute = 1440; // Clamped to midnight
  }

  const wakingInterval: TimeInterval = {
    startMinute: wakeMinute,
    endMinute: sleepMinute,
  };

  const fixedBlocks: ScheduledBlockOutput[] = [];
  const occupiedIntervals: TimeInterval[] = [];

  // Check for full day holiday in calendar exceptions
  const targetDayOfWeek = getDayOfWeekFromDate(targetDate);
  const exceptions = calendarContext?.exceptions || [];
  const fullDayHoliday = exceptions.find(
    (ex) => ex.date === targetDate && (ex.isFullDay || ex.exceptionType === 'HOLIDAY')
  );

  // 1. Process Timetable Sessions (if not cancelled by a full day holiday)
  if (!fullDayHoliday && calendarContext?.timetableSessions) {
    for (const session of calendarContext.timetableSessions) {
      if (session.dayOfWeek !== targetDayOfWeek) continue;

      // Check if session has a specific cancellation exception
      const isCancelled = exceptions.some(
        (ex) =>
          ex.date === targetDate &&
          (ex.timetableSessionId === session.id ||
            (ex.exceptionType === 'CANCELLED_CLASS' &&
              ex.title?.toLowerCase() === session.title.toLowerCase()))
      );

      if (isCancelled) continue;

      const startMin = timeToMinutes(session.startTime);
      const endMin = timeToMinutes(session.endTime);

      if (startMin >= endMin) continue;

      // Clamp to day boundaries
      const clampedStart = Math.max(0, startMin);
      const clampedEnd = Math.min(1440, endMin);

      fixedBlocks.push({
        id: `college-${session.id}`,
        startTime: session.startTime,
        endTime: session.endTime,
        startMinute: clampedStart,
        endMinute: clampedEnd,
        durationMinutes: clampedEnd - clampedStart,
        blockType: 'COLLEGE',
        isFixed: true,
        title: session.title,
        eventId: session.id,
        color: session.color || '#6366f1',
        metadata: {
          location: session.location,
          notes: session.sessionType,
        },
      });

      occupiedIntervals.push({
        startMinute: clampedStart,
        endMinute: clampedEnd,
      });

      // Optional buffer around session
      if (options?.bufferBetweenSessionsMinutes && options.bufferBetweenSessionsMinutes > 0) {
        const buf = options.bufferBetweenSessionsMinutes;
        occupiedIntervals.push({
          startMinute: Math.max(wakeMinute, clampedStart - buf),
          endMinute: clampedStart,
        });
        occupiedIntervals.push({
          startMinute: clampedEnd,
          endMinute: Math.min(sleepMinute, clampedEnd + buf),
        });
      }
    }
  }

  // 2. Process Calendar Events
  if (calendarContext?.calendarEvents) {
    for (const event of calendarContext.calendarEvents) {
      // Determine if event falls on targetDate
      let startMin = 0;
      let endMin = 1440;

      if (event.isAllDay) {
        startMin = wakeMinute;
        endMin = sleepMinute;
      } else {
        startMin = timeToMinutes(event.startTime);
        endMin = timeToMinutes(event.endTime);
      }

      if (startMin >= endMin) continue;

      const clampedStart = Math.max(0, startMin);
      const clampedEnd = Math.min(1440, endMin);

      fixedBlocks.push({
        id: `event-${event.id}`,
        startTime: minutesToTime(clampedStart),
        endTime: minutesToTime(clampedEnd),
        startMinute: clampedStart,
        endMinute: clampedEnd,
        durationMinutes: clampedEnd - clampedStart,
        blockType: 'EVENT',
        isFixed: true,
        title: event.title,
        eventId: event.id,
        color: event.color || '#f59e0b',
        metadata: {
          location: event.location,
          notes: event.eventType,
        },
      });

      occupiedIntervals.push({
        startMinute: clampedStart,
        endMinute: clampedEnd,
      });
    }
  }

  // 3. Process direct Fixed Commitments (if provided)
  if (fixedCommitments) {
    for (const fc of fixedCommitments) {
      const startMin = timeToMinutes(fc.startTime);
      const endMin = timeToMinutes(fc.endTime);
      if (startMin >= endMin) continue;

      fixedBlocks.push({
        id: fc.id,
        startTime: fc.startTime,
        endTime: fc.endTime,
        startMinute: startMin,
        endMinute: endMin,
        durationMinutes: endMin - startMin,
        blockType: fc.blockType,
        isFixed: true,
        title: fc.title,
        eventId: fc.id,
        color: fc.color || '#6366f1',
        metadata: {
          location: fc.location,
          notes: fc.description,
        },
      });

      occupiedIntervals.push({
        startMinute: startMin,
        endMinute: endMin,
      });
    }
  }

  // 4. Reserve Meal Blocks (Breakfast, Lunch, Dinner)
  const mealBlocks: ScheduledBlockOutput[] = [];
  const includeMeals = options?.includeMeals !== false;

  if (includeMeals) {
    const mealDuration = preferences.mealDurationMinutes || 45;

    const mealConfigs = [
      {
        name: 'Breakfast',
        time: preferences.breakfastTime || '08:30',
        type: 'MEAL' as const,
      },
      {
        name: 'Lunch',
        time: preferences.lunchTime || '13:00',
        type: 'MEAL' as const,
      },
      {
        name: 'Dinner',
        time: preferences.dinnerTime || '20:30',
        type: 'MEAL' as const,
      },
    ];

    for (const meal of mealConfigs) {
      const mealStart = timeToMinutes(meal.time);
      const mealEnd = mealStart + mealDuration;

      // Only schedule within waking window
      if (mealStart >= wakeMinute && mealEnd <= sleepMinute) {
        // Check if meal overlaps with existing fixed blocks
        const collidesWithFixed = occupiedIntervals.some(
          (occ) => mealStart < occ.endMinute && occ.startMinute < mealEnd
        );

        // If it doesn't collide with fixed commitment, place meal block
        if (!collidesWithFixed) {
          const mBlock: ScheduledBlockOutput = {
            id: `meal-${meal.name.toLowerCase()}`,
            startTime: minutesToTime(mealStart),
            endTime: minutesToTime(mealEnd),
            startMinute: mealStart,
            endMinute: mealEnd,
            durationMinutes: mealDuration,
            blockType: 'MEAL',
            isFixed: false,
            title: meal.name,
            color: '#f97316',
            metadata: {
              notes: `${meal.name} window`,
            },
          };

          mealBlocks.push(mBlock);
          occupiedIntervals.push({
            startMinute: mealStart,
            endMinute: mealEnd,
          });
        }
      }
    }
  }

  // Subtract all occupied intervals from waking interval to get available free intervals
  const availableIntervals = subtractIntervals([wakingInterval], occupiedIntervals);

  return {
    wakeMinute,
    sleepMinute,
    wakingInterval,
    fixedBlocks,
    mealBlocks,
    occupiedIntervals: mergeIntervals(occupiedIntervals),
    availableIntervals,
  };
}
