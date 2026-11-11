import {
  ISchedulerEngine,
  SchedulerRequest,
  ScheduleResult,
  ScheduledBlockOutput,
  ScheduleMetrics,
} from './types';
import { calculateAvailability } from './availability';
import { allocateTasks } from './allocation';
import { allocateLeisureAndFreeTime } from './breaks';
import { validateSchedule } from './validation';
import { getTotalMinutes } from './intervals';

export class TempoSchedulerEngine implements ISchedulerEngine {
  generateSchedule(request: SchedulerRequest): ScheduleResult {
    // 1. Calculate Availability & Fixed Commitments
    const availability = calculateAvailability(request);

    // 2. Allocate Tasks & Insert Necessary Breaks
    const allocation = allocateTasks(request, availability.availableIntervals);

    // 3. Allocate Leisure and Designate Free Time Blocks
    const leisureAndFree = allocateLeisureAndFreeTime(
      request,
      allocation.remainingAvailableIntervals
    );

    // 4. Combine all blocks
    const allBlocks: ScheduledBlockOutput[] = [
      ...availability.fixedBlocks,
      ...availability.mealBlocks,
      ...allocation.taskBlocks,
      ...allocation.breakBlocks,
      ...leisureAndFree.leisureBlocks,
      ...leisureAndFree.freeTimeBlocks,
    ];

    // Sort chronologically by start minute
    allBlocks.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

    // 5. Validate the generated schedule
    const validation = validateSchedule(allBlocks, request);
    if (!validation.isValid) {
      const errorMsg = validation.violations.map((v) => `[${v.code}] ${v.message}`).join('; ');
      throw new Error(`Schedule validation failed: ${errorMsg}`);
    }

    // 6. Calculate Metrics
    const wakingMinutes = availability.sleepMinute - availability.wakeMinute;
    const sleepMinutes = 1440 - wakingMinutes;

    const totalScheduledWorkMinutes = allocation.taskBlocks.reduce(
      (sum, b) => sum + b.durationMinutes,
      0
    );

    const totalFixedCommitmentMinutes = availability.fixedBlocks.reduce(
      (sum, b) => sum + b.durationMinutes,
      0
    );

    const totalBreakAndMealMinutes =
      availability.mealBlocks.reduce((sum, b) => sum + b.durationMinutes, 0) +
      allocation.breakBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);

    const totalLeisureMinutes = leisureAndFree.leisureBlocks.reduce(
      (sum, b) => sum + b.durationMinutes,
      0
    );

    const freeTimeRemainingMinutes = getTotalMinutes(leisureAndFree.remainingIntervals);

    const totalAvailableWorkMinutes = getTotalMinutes(availability.availableIntervals);

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
