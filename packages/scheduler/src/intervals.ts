import { TimeInterval } from './types';

/**
 * Converts a "HH:mm" 24-hour time string to total minutes from midnight (0 - 1440).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // If an ISO date string was provided, extract the time portion
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    const [hh, mm] = timePart.substring(0, 5).split(':').map(Number);
    return (hh || 0) * 60 + (mm || 0);
  }
  const [hh, mm] = timeStr.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

/**
 * Converts total minutes from midnight to a 24-hour "HH:mm" formatted string.
 */
export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(1440, Math.round(minutes)));
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Validates whether an interval is positive and within daily boundaries (0 to 1440).
 */
export function isValidInterval(interval: TimeInterval): boolean {
  return (
    interval.startMinute >= 0 &&
    interval.endMinute <= 1440 &&
    interval.startMinute < interval.endMinute
  );
}

/**
 * Determines whether two intervals overlap (exclusive of touching boundaries).
 */
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/**
 * Merges a list of possibly overlapping or adjacent intervals into a minimal list of disjoint sorted intervals.
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  const valid = intervals
    .filter(isValidInterval)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  if (valid.length === 0) return [];

  const merged: TimeInterval[] = [valid[0]];

  for (let i = 1; i < valid.length; i++) {
    const current = valid[i];
    const last = merged[merged.length - 1];

    if (current.startMinute <= last.endMinute) {
      // Overlapping or adjacent: extend the last interval if current ends later
      last.endMinute = Math.max(last.endMinute, current.endMinute);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Subtracts occupied intervals from available intervals, returning the remaining free intervals.
 */
export function subtractIntervals(
  available: TimeInterval[],
  occupied: TimeInterval[]
): TimeInterval[] {
  const mergedOccupied = mergeIntervals(occupied);
  let remaining: TimeInterval[] = [...available.filter(isValidInterval)];

  for (const occ of mergedOccupied) {
    const nextRemaining: TimeInterval[] = [];

    for (const free of remaining) {
      // Case 1: No overlap, free interval is strictly before occupied
      if (free.endMinute <= occ.startMinute) {
        nextRemaining.push(free);
        continue;
      }
      // Case 2: No overlap, free interval is strictly after occupied
      if (free.startMinute >= occ.endMinute) {
        nextRemaining.push(free);
        continue;
      }

      // Case 3: Overlapping. May split free into up to two pieces (before and after occ)
      if (free.startMinute < occ.startMinute) {
        nextRemaining.push({
          startMinute: free.startMinute,
          endMinute: occ.startMinute,
        });
      }

      if (free.endMinute > occ.endMinute) {
        nextRemaining.push({
          startMinute: occ.endMinute,
          endMinute: free.endMinute,
        });
      }
    }

    remaining = nextRemaining;
  }

  return remaining.filter((int) => int.endMinute - int.startMinute > 0);
}

/**
 * Calculates total duration in minutes of a list of disjoint intervals.
 */
export function getTotalMinutes(intervals: TimeInterval[]): number {
  return intervals.reduce((sum, int) => sum + (int.endMinute - int.startMinute), 0);
}
