import { SchedulerRequest, TimeInterval, ScheduledBlockOutput, SchedulerRoutine } from './types';
import { timeToMinutes, minutesToTime, subtractIntervals, mergeIntervals } from './intervals';

export interface AvailabilityResult {
  wakeMinute: number;
  sleepMinute: number;
  wakingInterval: TimeInterval;
  fixedBlocks: ScheduledBlockOutput[];
  mealBlocks: ScheduledBlockOutput[];
  routineBlocks: ScheduledBlockOutput[];
  flexibleRoutines: SchedulerRoutine[];
  occupiedIntervals: TimeInterval[];
  availableIntervals: TimeInterval[];
}

export function getRoutineDefaultColor(category: string): string {
  switch (category) {
    case 'EXERCISE':
      return '#10b981'; // emerald
    case 'MEAL':
      return '#f97316'; // orange
    case 'MORNING_ROUTINE':
      return '#06b6d4'; // cyan
    case 'EVENING_ROUTINE':
      return '#6366f1'; // indigo
    case 'WORK':
      return '#3b82f6'; // blue
    case 'STUDY':
      return '#8b5cf6'; // violet
    case 'RELAXATION':
      return '#ec4899'; // pink
    case 'PERSONAL':
      return '#14b8a6'; // teal
    case 'SLEEP':
      return '#475569'; // slate
    default:
      return '#a855f7'; // purple
  }
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
  const { preferences, targetDate, calendarContext, fixedCommitments, routines, options } = request;
  const targetDayOfWeek = getDayOfWeekFromDate(targetDate);

  // Filter active routines for target day of week
  const activeRoutines = (routines || []).filter(
    (r) => r.isEnabled !== false && r.daysOfWeek.includes(targetDayOfWeek)
  );

  // Check for active day-specific sleep routine
  let wakeMinute = timeToMinutes(preferences.wakeTime || '07:00');
  let sleepMinute = timeToMinutes(preferences.sleepTime || '23:00');

  const sleepRoutine = activeRoutines.find((r) => r.category === 'SLEEP');
  if (sleepRoutine) {
    if (sleepRoutine.startTime) sleepMinute = timeToMinutes(sleepRoutine.startTime);
    if (sleepRoutine.endTime) wakeMinute = timeToMinutes(sleepRoutine.endTime);
  }

  // Guard against invalid sleep time
  if (sleepMinute <= wakeMinute) {
    sleepMinute = 1440; // Clamped to midnight
  }

  const wakingInterval: TimeInterval = {
    startMinute: wakeMinute,
    endMinute: sleepMinute,
  };

  const fixedBlocks: ScheduledBlockOutput[] = [];
  const routineBlocks: ScheduledBlockOutput[] = [];
  const flexibleRoutines: SchedulerRoutine[] = [];
  const occupiedIntervals: TimeInterval[] = [];

  // Check for full day holiday in calendar exceptions
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

  // 3b. Process Daily Personal Routines (Fixed and Flexible)
  for (const routine of activeRoutines) {
    if (routine.category === 'SLEEP') continue;

    if (routine.classification === 'FIXED') {
      const startMin = timeToMinutes(routine.startTime);
      let endMin = timeToMinutes(routine.endTime);
      if (endMin <= startMin) {
        endMin = Math.min(1440, startMin + (routine.durationMinutes || 60));
      }

      const clampedStart = Math.max(0, startMin);
      const clampedEnd = Math.min(1440, endMin);

      const rBlock: ScheduledBlockOutput = {
        id: `routine-${routine.id}`,
        startTime: routine.startTime,
        endTime: minutesToTime(clampedEnd),
        startMinute: clampedStart,
        endMinute: clampedEnd,
        durationMinutes: clampedEnd - clampedStart,
        blockType: routine.category === 'MEAL' ? 'MEAL' : 'ROUTINE',
        isFixed: true,
        title: routine.name,
        color: routine.color || getRoutineDefaultColor(routine.category),
        metadata: {
          routineId: routine.id,
          category: routine.category,
          classification: 'FIXED',
          notes: routine.description,
        },
      };

      routineBlocks.push(rBlock);
      occupiedIntervals.push({
        startMinute: clampedStart,
        endMinute: clampedEnd,
      });
    } else {
      flexibleRoutines.push(routine);
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
      // Check if user already has an active custom routine covering this meal
      const hasCustomMealRoutine = activeRoutines.some(
        (r) =>
          r.category === 'MEAL' &&
          (r.name.toLowerCase().includes(meal.name.toLowerCase()) ||
            Math.abs(timeToMinutes(r.startTime) - timeToMinutes(meal.time)) <= 60)
      );

      if (hasCustomMealRoutine) continue;

      const mealStart = timeToMinutes(meal.time);
      const mealEnd = mealStart + mealDuration;

      // Only schedule within waking window
      if (mealStart >= wakeMinute && mealEnd <= sleepMinute) {
        // Check if meal overlaps with existing fixed blocks or routines
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
    routineBlocks,
    flexibleRoutines,
    occupiedIntervals: mergeIntervals(occupiedIntervals),
    availableIntervals,
  };
}
