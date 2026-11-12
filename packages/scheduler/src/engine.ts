import {
  ISchedulerEngine,
  SchedulerRequest,
  ScheduleResult,
  ScheduledBlockOutput,
  ScheduleMetrics,
  SchedulerRoutine,
  TimeInterval,
} from './types';
import { calculateAvailability, getRoutineDefaultColor } from './availability';
import { allocateTasks } from './allocation';
import { allocateLeisureAndFreeTime } from './breaks';
import { validateSchedule } from './validation';
import { getTotalMinutes, timeToMinutes, minutesToTime, subtractIntervals } from './intervals';

export function allocateFlexibleRoutines(
  routines: SchedulerRoutine[],
  availableIntervals: TimeInterval[]
): {
  routineBlocks: ScheduledBlockOutput[];
  remainingAvailableIntervals: TimeInterval[];
} {
  const routineBlocks: ScheduledBlockOutput[] = [];
  let currentAvailable = [...availableIntervals];

  for (const routine of routines) {
    const prefStart = timeToMinutes(routine.startTime);
    const prefEnd = timeToMinutes(routine.endTime);
    const duration = routine.durationMinutes || (prefEnd > prefStart ? prefEnd - prefStart : 60);

    const prefSlot: TimeInterval = {
      startMinute: prefStart,
      endMinute: prefStart + duration,
    };

    let allocatedSlot: TimeInterval | null = null;

    // Check if preferred slot is free in available intervals
    const fitsInPref = currentAvailable.some(
      (iv) => iv.startMinute <= prefSlot.startMinute && iv.endMinute >= prefSlot.endMinute
    );

    if (fitsInPref) {
      allocatedSlot = prefSlot;
    } else {
      // Find best available slot closest to prefStart
      const suitable = currentAvailable.filter((iv) => iv.endMinute - iv.startMinute >= duration);
      if (suitable.length > 0) {
        suitable.sort(
          (a, b) => Math.abs(a.startMinute - prefStart) - Math.abs(b.startMinute - prefStart)
        );
        const best = suitable[0];
        allocatedSlot = {
          startMinute: best.startMinute,
          endMinute: best.startMinute + duration,
        };
      }
    }

    if (allocatedSlot) {
      routineBlocks.push({
        id: `routine-${routine.id}`,
        startTime: minutesToTime(allocatedSlot.startMinute),
        endTime: minutesToTime(allocatedSlot.endMinute),
        startMinute: allocatedSlot.startMinute,
        endMinute: allocatedSlot.endMinute,
        durationMinutes: duration,
        blockType: routine.category === 'MEAL' ? 'MEAL' : 'ROUTINE',
        isFixed: false,
        title: routine.name,
        color: routine.color || getRoutineDefaultColor(routine.category),
        metadata: {
          routineId: routine.id,
          category: routine.category,
          classification: 'FLEXIBLE',
          notes: routine.description,
        },
      });

      currentAvailable = subtractIntervals(currentAvailable, [allocatedSlot]);
    }
  }

  return {
    routineBlocks,
    remainingAvailableIntervals: currentAvailable,
  };
}

export class TempoSchedulerEngine implements ISchedulerEngine {
  generateSchedule(request: SchedulerRequest): ScheduleResult {
    // 1. Calculate Availability & Fixed Commitments
    const availability = calculateAvailability(request);

    // 2. Allocate Flexible Routines
    const flexibleAlloc = allocateFlexibleRoutines(
      availability.flexibleRoutines,
      availability.availableIntervals
    );

    // 3. Allocate Tasks & Insert Necessary Breaks
    const allocation = allocateTasks(request, flexibleAlloc.remainingAvailableIntervals);

    // 4. Allocate Leisure and Designate Free Time Blocks
    const leisureAndFree = allocateLeisureAndFreeTime(
      request,
      allocation.remainingAvailableIntervals
    );

    // 5. Combine all blocks
    const allBlocks: ScheduledBlockOutput[] = [
      ...availability.fixedBlocks,
      ...availability.routineBlocks,
      ...flexibleAlloc.routineBlocks,
      ...availability.mealBlocks,
      ...allocation.taskBlocks,
      ...allocation.breakBlocks,
      ...leisureAndFree.leisureBlocks,
      ...leisureAndFree.freeTimeBlocks,
    ];

    // Sort chronologically by start minute
    allBlocks.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

    // 6. Validate the generated schedule
    const validation = validateSchedule(allBlocks, request);
    if (!validation.isValid) {
      const errorMsg = validation.violations.map((v) => `[${v.code}] ${v.message}`).join('; ');
      throw new Error(`Schedule validation failed: ${errorMsg}`);
    }

    // 7. Calculate Metrics
    const wakingMinutes = availability.sleepMinute - availability.wakeMinute;
    const sleepMinutes = 1440 - wakingMinutes;

    const totalScheduledWorkMinutes = allocation.taskBlocks.reduce(
      (sum, b) => sum + b.durationMinutes,
      0
    );

    const totalFixedCommitmentMinutes =
      availability.fixedBlocks.reduce((sum, b) => sum + b.durationMinutes, 0) +
      availability.routineBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);

    const totalBreakAndMealMinutes =
      availability.mealBlocks.reduce((sum, b) => sum + b.durationMinutes, 0) +
      allocation.breakBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);

    const totalLeisureMinutes = leisureAndFree.leisureBlocks.reduce(
      (sum, b) => sum + b.durationMinutes,
      0
    );

    const freeTimeRemainingMinutes = getTotalMinutes(leisureAndFree.remainingIntervals);

    const totalAvailableWorkMinutes = getTotalMinutes(flexibleAlloc.remainingAvailableIntervals);

    // Efficiency Score (percentage of available work time successfully scheduled, capped at 100)
    const efficiencyScore =
      totalAvailableWorkMinutes > 0
        ? Math.min(100, Math.round((totalScheduledWorkMinutes / totalAvailableWorkMinutes) * 100))
        : 100;

    const metrics: ScheduleMetrics = {
      totalDayMinutes: 1440,
      sleepMinutes,
      wakingMinutes,
      totalAvailableWorkMinutes,
      totalScheduledWorkMinutes,
      totalFixedCommitmentMinutes,
      totalBreakAndMealMinutes,
      totalLeisureMinutes,
      freeTimeRemainingMinutes,
      efficiencyScore,
    };

    return {
      date: request.targetDate,
      blocks: allBlocks,
      scheduledTasks: allocation.scheduledTasks,
      partiallyScheduledTasks: allocation.partiallyScheduledTasks,
      unscheduledTasks: allocation.unscheduledTasks,
      metrics,
    };
  }
}
