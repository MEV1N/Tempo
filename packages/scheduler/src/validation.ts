import { ScheduledBlockOutput, SchedulerRequest, SchedulerTaskInput } from './types';
import { timeToMinutes } from './intervals';

export interface ValidationViolation {
  code: string;
  message: string;
  blockId?: string;
  taskId?: string;
}

export interface ValidationReport {
  isValid: boolean;
  violations: ValidationViolation[];
}

/**
 * Validates generated schedule blocks against all Tempo scheduling invariants.
 */
export function validateSchedule(
  blocks: ScheduledBlockOutput[],
  request: SchedulerRequest
): ValidationReport {
  const violations: ValidationViolation[] = [];
  const { preferences, tasks, targetDate } = request;

  const wakeMin = timeToMinutes(preferences.wakeTime || '07:00');
  let sleepMin = timeToMinutes(preferences.sleepTime || '23:00');
  if (sleepMin <= wakeMin) sleepMin = 1440;

  // Sort blocks chronologically
  const sorted = [...blocks].sort(
    (a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute
  );

  const taskMap = new Map<string, SchedulerTaskInput>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const allocatedMinutesByTask = new Map<string, number>();

  for (let i = 0; i < sorted.length; i++) {
    const block = sorted[i];

    // 1. Check positive duration
    if (block.durationMinutes <= 0 || block.startMinute >= block.endMinute) {
      violations.push({
        code: 'INVALID_DURATION',
        message: `Block "${block.title}" has invalid duration (${block.durationMinutes}m)`,
        blockId: block.id,
      });
    }

    // 2. Check daily boundaries (0 to 1440)
    if (block.startMinute < 0 || block.endMinute > 1440) {
      violations.push({
        code: 'OUT_OF_BOUNDS',
        message: `Block "${block.title}" is outside 24-hour day boundaries (${block.startMinute} - ${block.endMinute})`,
        blockId: block.id,
      });
    }

    // 3. Check sleep period protection for task blocks
    if (block.blockType === 'TASK') {
      if (block.startMinute < wakeMin || block.endMinute > sleepMin) {
        violations.push({
          code: 'SLEEP_CONFLICT',
          message: `Task block "${block.title}" is scheduled during user sleep hours`,
          blockId: block.id,
          taskId: block.taskId || undefined,
        });
      }
    }

    // 4. Check overlap with previous block
    if (i > 0) {
      const prev = sorted[i - 1];
      if (block.startMinute < prev.endMinute) {
        violations.push({
          code: 'OVERLAPPING_BLOCKS',
          message: `Block "${block.title}" (${block.startTime}-${block.endTime}) overlaps with "${prev.title}" (${prev.startTime}-${prev.endTime})`,
          blockId: block.id,
        });
      }
    }

    // 5. Task-specific validations
    if (block.blockType === 'TASK' && block.taskId) {
      const task = taskMap.get(block.taskId);

      // Track total minutes allocated
      const curr = allocatedMinutesByTask.get(block.taskId) || 0;
      allocatedMinutesByTask.set(block.taskId, curr + block.durationMinutes);

      if (task) {
        // Minimum session check for splittable task
        const minSession = Math.max(15, task.minSessionMinutes || 30);
        if (
          task.canSplit &&
          block.durationMinutes < minSession &&
          block.durationMinutes < task.estimatedMinutes
        ) {
          // Exception: only allowed if it's the exact tail remnant of the task
          const isTailRemnant = curr + block.durationMinutes === task.estimatedMinutes;
          if (!isTailRemnant) {
            violations.push({
              code: 'MIN_SESSION_VIOLATION',
              message: `Task session "${block.title}" duration (${block.durationMinutes}m) is below minSessionMinutes (${minSession}m)`,
              blockId: block.id,
              taskId: task.id,
            });
          }
        }

        // Hard deadline check if deadline is today
        if (task.dueDate && task.dueDate.startsWith(targetDate) && task.dueDate.includes('T')) {
          const deadlineMin = timeToMinutes(task.dueDate);
          if (block.endMinute > deadlineMin) {
            violations.push({
              code: 'DEADLINE_VIOLATION',
              message: `Task "${task.title}" is scheduled until ${block.endTime}, but its hard deadline is ${task.dueDate}`,
              blockId: block.id,
              taskId: task.id,
            });
          }
        }
      }
    }
  }

  // 6. Check total allocated duration does not exceed task estimated minutes
  for (const [taskId, totalAllocated] of allocatedMinutesByTask.entries()) {
    const task = taskMap.get(taskId);
    if (task && totalAllocated > task.estimatedMinutes) {
      violations.push({
        code: 'OVER_ALLOCATED',
        message: `Task "${task.title}" allocated for ${totalAllocated}m which exceeds estimated ${task.estimatedMinutes}m`,
        taskId,
      });
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
