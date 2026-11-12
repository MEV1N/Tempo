import {
  RescheduleRequest,
  RescheduleResult,
  ScheduledBlockOutput,
  ScheduleDiffItem,
  TimeInterval,
  SchedulerTaskInput,
  ScheduleMetrics,
} from './types';
import { timeToMinutes, intervalsOverlap, subtractIntervals, getTotalMinutes } from './intervals';
import { allocateTasks } from './allocation';
import { allocateLeisureAndFreeTime } from './breaks';
import { validateSchedule } from './validation';
import { getDayOfWeekFromDate } from './availability';

export class TempoRescheduler {
  reschedule(request: RescheduleRequest): RescheduleResult {
    const {
      currentBlocks,
      targetDate,
      preferences,
      tasks,
      routines = [],
      taskModifications = [],
      newEvents = [],
      reason = 'Schedule revised',
    } = request;

    const targetDayOfWeek = getDayOfWeekFromDate(targetDate);
    const activeSleepRoutine = (routines || []).find(
      (r) =>
        r.isEnabled !== false &&
        r.category === 'SLEEP' &&
        (r.daysOfWeek || []).includes(targetDayOfWeek)
    );

    let wakeMin = timeToMinutes(preferences.wakeTime || '07:00');
    let sleepMin = timeToMinutes(preferences.sleepTime || '23:00');

    if (activeSleepRoutine) {
      if (activeSleepRoutine.startTime) sleepMin = timeToMinutes(activeSleepRoutine.startTime);
      if (activeSleepRoutine.endTime) wakeMin = timeToMinutes(activeSleepRoutine.endTime);
    }
    if (sleepMin <= wakeMin) sleepMin = 1440;

    const wakingInterval: TimeInterval = { startMinute: wakeMin, endMinute: sleepMin };

    // 1. Identify Task Completion or Time Adjustment Overrides
    const completedTaskIds = new Set<string>();
    const taskAdditionalMinutesMap = new Map<string, number>();

    for (const mod of taskModifications) {
      if (mod.completed) {
        completedTaskIds.add(mod.taskId);
      }
      if (mod.additionalMinutes) {
        taskAdditionalMinutesMap.set(mod.taskId, mod.additionalMinutes);
      }
    }

    // 2. Identify Anchored / Immovable Blocks
    // Anchored = (isFixed || isLocked) && not completed
    const anchoredBlocks: ScheduledBlockOutput[] = [];
    const occupiedIntervals: TimeInterval[] = [];

    // Process current blocks: preserve fixed, locked, and meals first
    for (const b of currentBlocks) {
      // If task is completed, drop future blocks for it
      if (b.taskId && completedTaskIds.has(b.taskId)) {
        continue;
      }

      if (b.isFixed || b.isLocked || b.blockType === 'MEAL') {
        anchoredBlocks.push(b);
        occupiedIntervals.push({ startMinute: b.startMinute, endMinute: b.endMinute });
      }
    }

    // Add new incoming events as anchored blocks
    for (const ne of newEvents) {
      const sMin = timeToMinutes(ne.startTime);
      const eMin = timeToMinutes(ne.endTime);
      if (sMin < eMin) {
        // Check if new event conflicts with any locked block
        const lockedConflict = anchoredBlocks.find(
          (b) =>
            b.isLocked &&
            intervalsOverlap(
              { startMinute: sMin, endMinute: eMin },
              { startMinute: b.startMinute, endMinute: b.endMinute }
            )
        );

        if (lockedConflict) {
          throw new Error(
            `Conflict with locked block: cannot add "${ne.title}" over locked block "${lockedConflict.title}" (${lockedConflict.startTime}-${lockedConflict.endTime})`
          );
        }

        const blk: ScheduledBlockOutput = {
          id: ne.id || `new-event-${sMin}`,
          startTime: ne.startTime,
          endTime: ne.endTime,
          startMinute: sMin,
          endMinute: eMin,
          durationMinutes: eMin - sMin,
          blockType: ne.blockType || 'EVENT',
          isFixed: true,
          isLocked: true,
          title: ne.title,
          color: '#f59e0b',
          metadata: {
            location: ne.location,
            notes: 'Newly added commitment',
          },
        };
        anchoredBlocks.push(blk);
        occupiedIntervals.push({ startMinute: sMin, endMinute: eMin });
      }
    }

    // 3. Evaluate Unlocked Blocks (Minimal-Change Strategy)
    // If an unlocked block does NOT conflict with anchored blocks or modified tasks, preserve it!
    const preservedUnlockedBlocks: ScheduledBlockOutput[] = [];
    const displacedTaskIds = new Set<string>();

    for (const b of currentBlocks) {
      if (b.isFixed || b.isLocked || b.blockType === 'MEAL' || b.blockType === 'FREE_TIME') {
        continue;
      }

      if (b.taskId && completedTaskIds.has(b.taskId)) {
        continue;
      }

      // Check if task duration was modified
      const hasDurationMod = b.taskId && taskAdditionalMinutesMap.has(b.taskId);

      // Check if block overlaps with any anchored block
      const hasConflict = occupiedIntervals.some((occ) =>
        intervalsOverlap(occ, { startMinute: b.startMinute, endMinute: b.endMinute })
      );

      if (!hasConflict && !hasDurationMod && b.blockType === 'TASK') {
        // Can be preserved safely in its original slot!
        preservedUnlockedBlocks.push(b);
        occupiedIntervals.push({ startMinute: b.startMinute, endMinute: b.endMinute });
      } else if (b.taskId) {
        // Needs reallocation
        displacedTaskIds.add(b.taskId);
      }
    }

    // 4. Calculate Available Intervals for Displaced & Extended Tasks
    const freeIntervals = subtractIntervals([wakingInterval], occupiedIntervals);

    // 5. Prepare Tasks that Need Allocation
    // Include displaced tasks + tasks with additional minutes
    const tasksToAllocate: SchedulerTaskInput[] = [];

    for (const t of tasks) {
      if (completedTaskIds.has(t.id)) continue;

      const additionalMins = taskAdditionalMinutesMap.get(t.id) || 0;
      const isDisplaced = displacedTaskIds.has(t.id);

      if (isDisplaced || additionalMins > 0) {
        // Calculate needed duration
        let neededMinutes = t.estimatedMinutes;
        if (additionalMins > 0) {
          neededMinutes += additionalMins;
        }

        // If partially preserved already, subtract preserved duration
        const alreadyPreservedMins = preservedUnlockedBlocks
          .filter((b) => b.taskId === t.id)
          .reduce((sum, b) => sum + b.durationMinutes, 0);

        const remainingToSchedule = Math.max(0, neededMinutes - alreadyPreservedMins);

        if (remainingToSchedule > 0) {
          tasksToAllocate.push({
            ...t,
            estimatedMinutes: remainingToSchedule,
            remainingMinutes: remainingToSchedule,
          });
        }
      }
    }

    // 6. Allocate Displaced Tasks into Free Intervals
    const allocation = allocateTasks(
      {
        userId: 'reschedule-user',
        targetDate,
        preferences,
        tasks: tasksToAllocate,
      },
      freeIntervals
    );

    // 7. Allocate Leisure and Free Time
    const leisureAndFree = allocateLeisureAndFreeTime(
      {
        userId: 'reschedule-user',
        targetDate,
        preferences,
        tasks: [],
      },
      allocation.remainingAvailableIntervals
    );

    // 8. Assemble All New Blocks & Sort
    const allNewBlocks: ScheduledBlockOutput[] = [
      ...anchoredBlocks,
      ...preservedUnlockedBlocks,
      ...allocation.taskBlocks,
      ...allocation.breakBlocks,
      ...leisureAndFree.leisureBlocks,
      ...leisureAndFree.freeTimeBlocks,
    ];

    allNewBlocks.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

    // 9. Validate the Revised Schedule
    const tasksWithModifications = tasks.map((t) => {
      const addMins = taskAdditionalMinutesMap.get(t.id) || 0;
      return {
        ...t,
        estimatedMinutes: t.estimatedMinutes + addMins,
      };
    });

    const validation = validateSchedule(allNewBlocks, {
      userId: 'reschedule-user',
      targetDate,
      preferences,
      tasks: tasksWithModifications,
    });

    if (!validation.isValid) {
      const errorMsg = validation.violations.map((v) => `[${v.code}] ${v.message}`).join('; ');
      throw new Error(`Rescheduled schedule failed validation: ${errorMsg}`);
    }

    // 10. Compute Diff and Changelog
    const diff: ScheduleDiffItem[] = [];
    const changelog: string[] = [];
    if (reason) {
      changelog.push(`Reason: ${reason}`);
    }

    // Map old blocks
    const oldTaskBlocks = currentBlocks.filter((b) => b.blockType === 'TASK');
    const newTaskBlocks = allNewBlocks.filter((b) => b.blockType === 'TASK');

    for (const nb of newTaskBlocks) {
      const match = oldTaskBlocks.find((ob) => ob.taskId === nb.taskId || ob.title === nb.title);

      if (!match) {
        diff.push({
          type: 'ADDED',
          title: nb.title,
          blockType: nb.blockType,
          newTime: `${nb.startTime}-${nb.endTime}`,
          details: `Newly scheduled task session (${nb.durationMinutes}m)`,
        });
        changelog.push(`Added "${nb.title}" at ${nb.startTime}-${nb.endTime}`);
      } else if (match.startMinute === nb.startMinute && match.endMinute === nb.endMinute) {
        diff.push({
          type: 'PRESERVED',
          title: nb.title,
          blockType: nb.blockType,
          oldTime: `${match.startTime}-${match.endTime}`,
          newTime: `${nb.startTime}-${nb.endTime}`,
          details: nb.isLocked ? 'Locked in place' : 'Preserved by minimal-change strategy',
        });
      } else {
        diff.push({
          type: 'MOVED',
          title: nb.title,
          blockType: nb.blockType,
          oldTime: `${match.startTime}-${match.endTime}`,
          newTime: `${nb.startTime}-${nb.endTime}`,
          details: `Relocated from ${match.startTime} to ${nb.startTime}`,
        });
        changelog.push(
          `Moved "${nb.title}" from ${match.startTime}-${match.endTime} to ${nb.startTime}-${nb.endTime}`
        );
      }
    }

    for (const ob of oldTaskBlocks) {
      const stillPresent = newTaskBlocks.some(
        (nb) => nb.taskId === ob.taskId || nb.title === ob.title
      );
      if (!stillPresent) {
        diff.push({
          type: 'REMOVED',
          title: ob.title,
          blockType: ob.blockType,
          oldTime: `${ob.startTime}-${ob.endTime}`,
          details: completedTaskIds.has(ob.taskId || '')
            ? 'Removed because task was marked completed'
            : 'Unscheduled due to conflict/capacity',
        });
        changelog.push(`Removed "${ob.title}" (${ob.startTime}-${ob.endTime})`);
      }
    }

    // 11. Metrics
    const wakingMinutes = sleepMin - wakeMin;
    const totalScheduledWorkMinutes = allNewBlocks
      .filter((b) => b.blockType === 'TASK')
      .reduce((sum, b) => sum + b.durationMinutes, 0);

    const totalFixedCommitmentMinutes = allNewBlocks
      .filter((b) => b.isFixed)
      .reduce((sum, b) => sum + b.durationMinutes, 0);

    const totalBreakAndMealMinutes = allNewBlocks
      .filter((b) => b.blockType === 'MEAL' || b.blockType === 'BREAK')
      .reduce((sum, b) => sum + b.durationMinutes, 0);

    const totalLeisureMinutes = allNewBlocks
      .filter((b) => b.blockType === 'LEISURE')
      .reduce((sum, b) => sum + b.durationMinutes, 0);

    const freeTimeRemainingMinutes = getTotalMinutes(leisureAndFree.remainingIntervals);

    const metrics: ScheduleMetrics = {
      totalDayMinutes: 1440,
      sleepMinutes: 1440 - wakingMinutes,
      wakingMinutes,
      totalAvailableWorkMinutes:
        wakingMinutes - totalFixedCommitmentMinutes - totalBreakAndMealMinutes,
      totalScheduledWorkMinutes,
      totalFixedCommitmentMinutes,
      totalBreakAndMealMinutes,
      totalLeisureMinutes,
      freeTimeRemainingMinutes,
      efficiencyScore: Math.min(
        100,
        Math.round(
          (totalScheduledWorkMinutes / Math.max(1, wakingMinutes - totalFixedCommitmentMinutes)) *
            100
        )
      ),
    };

    return {
      date: targetDate,
      blocks: allNewBlocks,
      diff,
      changelog,
      metrics,
      unscheduledTasks: allocation.unscheduledTasks,
    };
  }
}
