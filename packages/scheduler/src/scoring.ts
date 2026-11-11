import { SchedulerTaskInput, TimeInterval, SchedulerUserPreferences } from './types';
import { timeToMinutes } from './intervals';

export interface ScoredTask {
  task: SchedulerTaskInput;
  baseScore: number;
  remainingMinutes: number;
  daysUntilDeadline: number | null;
}

/**
 * Calculates calendar day difference between target date and task due date.
 * Returns negative if due date is before target date (overdue), 0 if due on target date, positive if future.
 */
export function getDaysUntilDeadline(
  targetDateStr: string,
  dueDateStr?: string | null
): number | null {
  if (!dueDateStr) return null;

  const targetDateOnly = targetDateStr.substring(0, 10);
  const dueDateOnly = dueDateStr.substring(0, 10);

  const [tY, tM, tD] = targetDateOnly.split('-').map(Number);
  const [dY, dM, dD] = dueDateOnly.split('-').map(Number);

  const targetUtc = Date.UTC(tY, tM - 1, tD);
  const dueUtc = Date.UTC(dY, dM - 1, dD);

  const diffMs = dueUtc - targetUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Computes the deterministic base score for a task on a given target date.
 */
export function computeTaskBaseScore(task: SchedulerTaskInput, targetDate: string): number {
  let score = 0;

  // 1. User-assigned Priority Score
  switch (task.priority) {
    case 'URGENT':
      score += 400;
      break;
    case 'HIGH':
      score += 250;
      break;
    case 'MEDIUM':
      score += 100;
      break;
    case 'LOW':
      score += 40;
      break;
  }

  // 2. Deadline Urgency Score
  const days = getDaysUntilDeadline(targetDate, task.dueDate);
  if (days !== null) {
    if (days < 0) {
      // Overdue task
      score += 1200;
    } else if (days === 0) {
      // Due today!
      score += 1000;
    } else if (days === 1) {
      // Due tomorrow
      score += 500;
    } else if (days <= 3) {
      score += 300;
    } else if (days <= 7) {
      score += 150;
    } else {
      score += 50;
    }
  }

  // 3. Status bonus
  if (task.status === 'IN_PROGRESS') {
    score += 80; // Encourage finishing work already started
  }

  return score;
}

/**
 * Scores the compatibility of a task with a specific time interval.
 */
export function computeSlotCompatibilityScore(
  task: SchedulerTaskInput,
  slot: TimeInterval,
  preferences: SchedulerUserPreferences
): number {
  let bonus = 0;

  const slotMid = (slot.startMinute + slot.endMinute) / 2;

  // Preferred time of day matching
  const prefTime = task.preferredTime || 'ANYTIME';
  switch (prefTime) {
    case 'MORNING': // 06:00 - 12:00 (360 - 720)
      if (slotMid >= 360 && slotMid < 720) bonus += 120;
      break;
    case 'AFTERNOON': // 12:00 - 17:00 (720 - 1020)
      if (slotMid >= 720 && slotMid < 1020) bonus += 120;
      break;
    case 'EVENING': // 17:00 - 21:00 (1020 - 1260)
      if (slotMid >= 1020 && slotMid < 1260) bonus += 120;
      break;
    case 'NIGHT': // 21:00 - 24:00 (1260 - 1440)
      if (slotMid >= 1260) bonus += 120;
      break;
    case 'ANYTIME':
      bonus += 30;
      break;
  }

  // Energy level alignment
  const energy = task.energyRequirement || 'MEDIUM';
  const workStartMin = timeToMinutes(preferences.preferredWorkStart || '09:00');
  const workEndMin = timeToMinutes(preferences.preferredWorkEnd || '18:00');

  if (energy === 'HIGH') {
    // High energy tasks preferred in the main work window / morning
    if (slotMid >= workStartMin && slotMid <= Math.min(workEndMin, 840)) {
      bonus += 90;
    }
  } else if (energy === 'LOW') {
    // Low energy tasks suitable for afternoon slump or evening
    if (slotMid >= 840 || slotMid < workStartMin) {
      bonus += 60;
    }
  }

  return bonus;
}

/**
 * Prepares and sorts task candidates deterministically.
 */
export function prepareCandidateTasks(
  tasks: SchedulerTaskInput[],
  targetDate: string
): ScoredTask[] {
  const scoredList: ScoredTask[] = tasks.map((task) => {
    const remaining = task.remainingMinutes ?? task.estimatedMinutes;
    return {
      task,
      baseScore: computeTaskBaseScore(task, targetDate),
      remainingMinutes: Math.max(0, remaining),
      daysUntilDeadline: getDaysUntilDeadline(targetDate, task.dueDate),
    };
  });

  // Sort deterministically:
  // 1. Base score descending (higher priority/urgency first)
  // 2. Days until deadline ascending (closer deadline first)
  // 3. Remaining minutes descending (larger items first)
  // 4. Task ID string ascending (deterministic tie-breaker)
  return scoredList.sort((a, b) => {
    if (b.baseScore !== a.baseScore) {
      return b.baseScore - a.baseScore;
    }

    if (a.daysUntilDeadline !== null && b.daysUntilDeadline !== null) {
      if (a.daysUntilDeadline !== b.daysUntilDeadline) {
        return a.daysUntilDeadline - b.daysUntilDeadline;
      }
    } else if (a.daysUntilDeadline !== null && b.daysUntilDeadline === null) {
      return -1;
    } else if (a.daysUntilDeadline === null && b.daysUntilDeadline !== null) {
      return 1;
    }

    if (b.remainingMinutes !== a.remainingMinutes) {
      return b.remainingMinutes - a.remainingMinutes;
    }

    return a.task.id.localeCompare(b.task.id);
  });
}
