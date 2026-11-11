import { SchedulerRequest, TimeInterval, ScheduledBlockOutput } from './types';
import { minutesToTime, subtractIntervals } from './intervals';

export interface LeisureAndFreeTimeResult {
  leisureBlocks: ScheduledBlockOutput[];
  freeTimeBlocks: ScheduledBlockOutput[];
  remainingIntervals: TimeInterval[];
}

/**
 * Allocates designated leisure time and labels any remaining unallocated waking intervals as FREE_TIME.
 */
export function allocateLeisureAndFreeTime(
  request: SchedulerRequest,
  availableIntervals: TimeInterval[]
): LeisureAndFreeTimeResult {
  const { preferences, options } = request;
  const includeLeisure = options?.includeLeisure !== false;
  const includeFreeTimeBlocks = options?.includeFreeTimeBlocks !== false;
  const leisureTarget = preferences.dailyLeisureTarget ?? 120;

  let intervals = [...availableIntervals];
  const leisureBlocks: ScheduledBlockOutput[] = [];
  const freeTimeBlocks: ScheduledBlockOutput[] = [];

  if (includeLeisure && leisureTarget > 0 && intervals.length > 0) {
    // We prefer placing leisure towards the evening / later in the day
    // Sort intervals by startMinute descending to find late-day slots first
    const lateIntervals = [...intervals].sort((a, b) => b.startMinute - a.startMinute);
    let remainingLeisureNeeded = leisureTarget;

    for (const slot of lateIntervals) {
      if (remainingLeisureNeeded <= 0) break;

      const slotDuration = slot.endMinute - slot.startMinute;
      if (slotDuration < 15) continue; // Skip tiny fragments

      // In the late slot, take from the end of the slot towards sleep
      const allocatedLeisure = Math.min(slotDuration, remainingLeisureNeeded);
      const startMin = slot.endMinute - allocatedLeisure;
      const endMin = slot.endMinute;

      leisureBlocks.push({
        id: `leisure-${startMin}`,
        startTime: minutesToTime(startMin),
        endTime: minutesToTime(endMin),
        startMinute: startMin,
        endMinute: endMin,
        durationMinutes: allocatedLeisure,
        blockType: 'LEISURE',
        isFixed: false,
        title: 'Leisure & Unwind',
        color: '#8b5cf6',
        metadata: {
          notes: 'Dedicated rest & personal time',
        },
      });

      remainingLeisureNeeded -= allocatedLeisure;
      intervals = subtractIntervals(intervals, [{ startMinute: startMin, endMinute: endMin }]);
    }
  }

  // Label all remaining intervals as FREE_TIME so the day has no unaccounted holes
  if (includeFreeTimeBlocks) {
    for (const free of intervals) {
      const dur = free.endMinute - free.startMinute;
      if (dur < 5) continue;

      freeTimeBlocks.push({
        id: `freetime-${free.startMinute}`,
        startTime: minutesToTime(free.startMinute),
        endTime: minutesToTime(free.endMinute),
        startMinute: free.startMinute,
        endMinute: free.endMinute,
        durationMinutes: dur,
        blockType: 'FREE_TIME',
        isFixed: false,
        title: 'Free Time',
        color: '#38bdf8',
        metadata: {
          notes: 'Available open time',
        },
      });
    }
  }

  return {
    leisureBlocks,
    freeTimeBlocks,
    remainingIntervals: intervals,
  };
}
