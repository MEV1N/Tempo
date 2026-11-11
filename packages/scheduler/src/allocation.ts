import {
  SchedulerRequest,
  TimeInterval,
  ScheduledBlockOutput,
  ScheduledTaskSummary,
  UnscheduledTaskSummary,
} from './types';
import { timeToMinutes, minutesToTime, getTotalMinutes, subtractIntervals } from './intervals';
import { prepareCandidateTasks, computeSlotCompatibilityScore } from './scoring';

export interface AllocationResult {
  taskBlocks: ScheduledBlockOutput[];
  breakBlocks: ScheduledBlockOutput[];
  scheduledTasks: ScheduledTaskSummary[];
  partiallyScheduledTasks: ScheduledTaskSummary[];
  unscheduledTasks: UnscheduledTaskSummary[];
  remainingAvailableIntervals: TimeInterval[];
}

/**
 * Extracts hard deadline minute from task dueDate if dueDate is on the target date.
 * Returns null if deadline is not today.
 */
export function getDeadlineMinuteToday(
  dueDateStr?: string | null,
  targetDate?: string
): number | null {
  if (!dueDateStr || !targetDate) return null;
  if (!dueDateStr.startsWith(targetDate)) return null;

  if (dueDateStr.includes('T')) {
    return timeToMinutes(dueDateStr);
  }
  return 1440; // End of the day if date only
}

/**
 * Allocates candidate tasks into available intervals using deterministic priority packing.
 */
export function allocateTasks(
  request: SchedulerRequest,
  initialAvailableIntervals: TimeInterval[]
): AllocationResult {
  const { preferences, targetDate, tasks } = request;

  let freeIntervals = [...initialAvailableIntervals];
  const taskBlocks: ScheduledBlockOutput[] = [];
  const breakBlocks: ScheduledBlockOutput[] = [];
  const scheduledTasks: ScheduledTaskSummary[] = [];
  const partiallyScheduledTasks: ScheduledTaskSummary[] = [];
  const unscheduledTasks: UnscheduledTaskSummary[] = [];

  const maxContinuousWork = preferences.maxContinuousWorkDuration || 90;
  const breakDuration = preferences.preferredBreakDuration || 15;

  // Prepare and rank candidate tasks
  const candidateTasks = prepareCandidateTasks(tasks, targetDate);

  for (const candidate of candidateTasks) {
    const task = candidate.task;

    // Check if task is already completed or canceled
    if (task.status === 'COMPLETED' || task.status === 'CANCELED' || task.status === 'SKIPPED') {
      continue;
    }

    // Check if deadline has already passed
    if (candidate.daysUntilDeadline !== null && candidate.daysUntilDeadline < 0) {
      unscheduledTasks.push({
        taskId: task.id,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        remainingMinutes: candidate.remainingMinutes,
        reason: 'DEADLINE_PASSED',
        details: `Task deadline (${task.dueDate}) has already passed before ${targetDate}`,
      });
      continue;
    }

    const deadlineMinToday = getDeadlineMinuteToday(task.dueDate, targetDate);

    // If deadline was today but earlier than current available intervals
    if (deadlineMinToday !== null && deadlineMinToday <= (freeIntervals[0]?.startMinute ?? 0)) {
      unscheduledTasks.push({
        taskId: task.id,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        remainingMinutes: candidate.remainingMinutes,
        reason: 'DEADLINE_PASSED',
        details: `Task deadline was today at ${minutesToTime(deadlineMinToday)}, which is before available working hours`,
      });
      continue;
    }

    const canSplit = task.canSplit === true;
    const minSession = Math.max(15, task.minSessionMinutes || 30);
    let remaining = candidate.remainingMinutes;
    let allocatedMinutesForTask = 0;
    const taskAllocatedBlocks: ScheduledBlockOutput[] = [];

    if (!canSplit) {
      // NON-SPLITTABLE TASK: Needs a single continuous block >= task.estimatedMinutes
      const requiredDuration = remaining;

      // Find compatible candidate intervals
      const matchingIntervals: { interval: TimeInterval; score: number }[] = [];

      for (const interval of freeIntervals) {
        const intervalLen = interval.endMinute - interval.startMinute;

        // Check if duration fits
        if (intervalLen < requiredDuration) continue;

        // Check if interval satisfies deadline today
        if (
          deadlineMinToday !== null &&
          interval.startMinute + requiredDuration > deadlineMinToday
        ) {
          continue;
        }

        const score = computeSlotCompatibilityScore(task, interval, preferences);
        matchingIntervals.push({ interval, score });
      }

      if (matchingIntervals.length > 0) {
        // Pick best matching interval (highest compatibility, then earliest)
        matchingIntervals.sort(
          (a, b) => b.score - a.score || a.interval.startMinute - b.interval.startMinute
        );
        const bestSlot = matchingIntervals[0].interval;

        const startMin = bestSlot.startMinute;
        const endMin = startMin + requiredDuration;

        const block: ScheduledBlockOutput = {
          id: `task-${task.id}-0`,
          startTime: minutesToTime(startMin),
          endTime: minutesToTime(endMin),
          startMinute: startMin,
          endMinute: endMin,
          durationMinutes: requiredDuration,
          blockType: 'TASK',
          isFixed: false,
          title: task.title,
          taskId: task.id,
          color: task.categoryColor || '#38bdf8',
          metadata: {
            priority: task.priority,
            energyRequirement: task.energyRequirement,
            sessionIndex: 1,
            totalSessions: 1,
            notes: task.description,
          },
        };

        taskBlocks.push(block);
        taskAllocatedBlocks.push(block);
        allocatedMinutesForTask += requiredDuration;
        remaining = 0;

        // Deduct from free intervals
        freeIntervals = subtractIntervals(freeIntervals, [
          { startMinute: startMin, endMinute: endMin },
        ]);

        // Insert break if work reached maxContinuousWork
        if (requiredDuration >= maxContinuousWork) {
          const breakStart = endMin;
          const breakEnd = breakStart + breakDuration;
          const canFitBreak = freeIntervals.some(
            (int) => int.startMinute <= breakStart && breakEnd <= int.endMinute
          );

          if (canFitBreak) {
            const bBlock: ScheduledBlockOutput = {
              id: `break-${task.id}`,
              startTime: minutesToTime(breakStart),
              endTime: minutesToTime(breakEnd),
              startMinute: breakStart,
              endMinute: breakEnd,
              durationMinutes: breakDuration,
              blockType: 'BREAK',
              isFixed: false,
              title: 'Short Break',
              color: '#94a3b8',
              metadata: {
                notes: `Post-task rest (${task.title})`,
              },
            };
            breakBlocks.push(bBlock);
            freeIntervals = subtractIntervals(freeIntervals, [
              { startMinute: breakStart, endMinute: breakEnd },
            ]);
          }
        }
      } else {
        // Could not fit non-splittable task
        const totalFree = getTotalMinutes(freeIntervals);
        if (totalFree < requiredDuration) {
          unscheduledTasks.push({
            taskId: task.id,
            title: task.title,
            estimatedMinutes: task.estimatedMinutes,
            remainingMinutes: requiredDuration,
            reason: 'INSUFFICIENT_TIME',
            details: `Requires continuous ${requiredDuration}m, but total free time is only ${totalFree}m`,
          });
        } else {
          unscheduledTasks.push({
            taskId: task.id,
            title: task.title,
            estimatedMinutes: task.estimatedMinutes,
            remainingMinutes: requiredDuration,
            reason: 'NO_SUITABLE_INTERVAL',
            details: `Requires a continuous ${requiredDuration}m interval without interruption`,
          });
        }
      }
    } else {
      // SPLITTABLE TASK: Can be divided into sessions >= minSession
      let sessionIndex = 0;

      while (remaining > 0) {
        // Find candidate intervals
        const validIntervals: { interval: TimeInterval; score: number }[] = [];

        for (const interval of freeIntervals) {
          const intervalLen = interval.endMinute - interval.startMinute;
          const minReq = Math.min(remaining, minSession);

          if (intervalLen < minReq) continue;

          // Check deadline
          if (deadlineMinToday !== null && interval.startMinute + minReq > deadlineMinToday) {
            continue;
          }

          const score = computeSlotCompatibilityScore(task, interval, preferences);
          validIntervals.push({ interval, score });
        }

        if (validIntervals.length === 0) {
          break; // No more intervals that can fit this task
        }

        // Sort by score then startMinute
        validIntervals.sort(
          (a, b) => b.score - a.score || a.interval.startMinute - b.interval.startMinute
        );
        const chosenSlot = validIntervals[0].interval;

        const availableSlotLen = chosenSlot.endMinute - chosenSlot.startMinute;
        let sessionDuration = Math.min(remaining, availableSlotLen, maxContinuousWork);

        // Respect deadline if today
        if (
          deadlineMinToday !== null &&
          chosenSlot.startMinute + sessionDuration > deadlineMinToday
        ) {
          sessionDuration = deadlineMinToday - chosenSlot.startMinute;
        }

        // If after deadline clipping sessionDuration is less than minimum required
        if (sessionDuration < Math.min(remaining, minSession)) {
          break;
        }

        sessionIndex++;
        const startMin = chosenSlot.startMinute;
        const endMin = startMin + sessionDuration;

        const block: ScheduledBlockOutput = {
          id: `task-${task.id}-${sessionIndex}`,
          startTime: minutesToTime(startMin),
          endTime: minutesToTime(endMin),
          startMinute: startMin,
          endMinute: endMin,
          durationMinutes: sessionDuration,
          blockType: 'TASK',
          isFixed: false,
          title: task.title,
          taskId: task.id,
          color: task.categoryColor || '#38bdf8',
          metadata: {
            priority: task.priority,
            energyRequirement: task.energyRequirement,
            sessionIndex,
            notes: task.description,
          },
        };

        taskBlocks.push(block);
        taskAllocatedBlocks.push(block);
        allocatedMinutesForTask += sessionDuration;
        remaining -= sessionDuration;

        // Deduct from free intervals
        freeIntervals = subtractIntervals(freeIntervals, [
          { startMinute: startMin, endMinute: endMin },
        ]);

        // Insert break if reached maxContinuousWork
        if (sessionDuration >= maxContinuousWork) {
          const breakStart = endMin;
          const breakEnd = breakStart + breakDuration;
          const canFitBreak = freeIntervals.some(
            (int) => int.startMinute <= breakStart && breakEnd <= int.endMinute
          );

          if (canFitBreak) {
            const bBlock: ScheduledBlockOutput = {
              id: `break-${task.id}-${sessionIndex}`,
              startTime: minutesToTime(breakStart),
              endTime: minutesToTime(breakEnd),
              startMinute: breakStart,
              endMinute: breakEnd,
              durationMinutes: breakDuration,
              blockType: 'BREAK',
              isFixed: false,
              title: 'Short Break',
              color: '#94a3b8',
              metadata: {
                notes: `Rest after session ${sessionIndex}`,
              },
            };
            breakBlocks.push(bBlock);
            freeIntervals = subtractIntervals(freeIntervals, [
              { startMinute: breakStart, endMinute: breakEnd },
            ]);
          }
        }
      }

      // Update totalSessions in metadata for allocated blocks
      for (const blk of taskAllocatedBlocks) {
        if (blk.metadata) {
          blk.metadata.totalSessions = sessionIndex;
        }
      }

      if (remaining === 0) {
        // Fully scheduled
      } else if (allocatedMinutesForTask > 0) {
        // Partially scheduled
        partiallyScheduledTasks.push({
          taskId: task.id,
          title: task.title,
          totalAllocatedMinutes: allocatedMinutesForTask,
          remainingMinutes: remaining,
          sessionCount: sessionIndex,
          isFullyScheduled: false,
        });

        unscheduledTasks.push({
          taskId: task.id,
          title: task.title,
          estimatedMinutes: task.estimatedMinutes,
          remainingMinutes: remaining,
          reason: 'INSUFFICIENT_TIME',
          details: `Partially scheduled (${allocatedMinutesForTask}m of ${task.estimatedMinutes}m). ${remaining}m remaining due to full schedule`,
        });
      } else {
        // Zero minutes scheduled
        const totalFree = getTotalMinutes(freeIntervals);
        unscheduledTasks.push({
          taskId: task.id,
          title: task.title,
          estimatedMinutes: task.estimatedMinutes,
          remainingMinutes: remaining,
          reason: totalFree < minSession ? 'INSUFFICIENT_TIME' : 'MIN_SESSION_NOT_MET',
          details: `Could not find an available slot meeting the minimum session requirement of ${minSession}m`,
        });
      }
    }

    if (allocatedMinutesForTask > 0 && remaining === 0) {
      scheduledTasks.push({
        taskId: task.id,
        title: task.title,
        totalAllocatedMinutes: allocatedMinutesForTask,
        remainingMinutes: 0,
        sessionCount: taskAllocatedBlocks.length,
        isFullyScheduled: true,
      });
    }
  }

  return {
    taskBlocks,
    breakBlocks,
    scheduledTasks,
    partiallyScheduledTasks,
    unscheduledTasks,
    remainingAvailableIntervals: freeIntervals,
  };
}
