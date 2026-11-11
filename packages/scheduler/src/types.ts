export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskEnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskTimeOfDay = 'ANYTIME' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type TaskStatusType = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'SKIPPED';

export type BlockType =
  'TASK' | 'COLLEGE' | 'EVENT' | 'MEAL' | 'BREAK' | 'LEISURE' | 'BUFFER' | 'FREE_TIME';

export type UnscheduledReason =
  | 'DEADLINE_PASSED'
  | 'INSUFFICIENT_TIME'
  | 'NO_SUITABLE_INTERVAL'
  | 'MIN_SESSION_NOT_MET'
  | 'CONFLICTING_COMMITMENTS'
  | 'ALREADY_COMPLETED';

export interface SchedulerUserPreferences {
  timezone: string; // e.g. "Asia/Kolkata" or "UTC"
  wakeTime: string; // "HH:mm", e.g. "07:00"
  sleepTime: string; // "HH:mm", e.g. "23:00"
  preferredWorkStart?: string; // "HH:mm", e.g. "09:00"
  preferredWorkEnd?: string; // "HH:mm", e.g. "18:00"
  breakfastTime?: string; // "HH:mm", e.g. "08:30"
  lunchTime?: string; // "HH:mm", e.g. "13:00"
  dinnerTime?: string; // "HH:mm", e.g. "20:30"
  mealDurationMinutes?: number; // default 45 mins
  preferredBreakDuration?: number; // default 15 mins
  maxContinuousWorkDuration?: number; // default 90 mins
  dailyLeisureTarget?: number; // default 120 mins
}

export interface SchedulerTaskInput {
  id: string;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  remainingMinutes?: number;
  priority: TaskPriority;
  status: TaskStatusType;
  preferredTime?: TaskTimeOfDay;
  energyRequirement?: TaskEnergyLevel;
  canSplit?: boolean;
  minSessionMinutes?: number;
  dueDate?: string | null; // ISO string or YYYY-MM-DD
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  createdAt?: string;
}

export interface SchedulerFixedCommitment {
  id: string;
  title: string;
  startTime: string; // "HH:mm" or ISO
  endTime: string; // "HH:mm" or ISO
  blockType: 'COLLEGE' | 'EVENT';
  isFixed: true;
  location?: string | null;
  description?: string | null;
  color?: string | null;
}

export interface SchedulerCalendarContext {
  timetableSessions: Array<{
    id: string;
    title: string;
    dayOfWeek: number; // 1 = Monday ... 7 = Sunday
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    sessionType: 'CLASS' | 'LAB' | 'BREAK' | 'TRAVEL' | 'OTHER';
    location?: string | null;
    color?: string | null;
  }>;
  exceptions: Array<{
    id: string;
    timetableSessionId?: string | null;
    date: string; // "YYYY-MM-DD"
    exceptionType: 'HOLIDAY' | 'CANCELLED_CLASS' | 'EXAM' | 'SPECIAL_EVENT' | 'OTHER';
    isFullDay: boolean;
    startTime?: string | null;
    endTime?: string | null;
    title?: string | null;
  }>;
  calendarEvents: Array<{
    id: string;
    title: string;
    startTime: string; // ISO
    endTime: string; // ISO
    isAllDay: boolean;
    eventType: 'EXAM' | 'APPOINTMENT' | 'MEETING' | 'COMMITMENT' | 'SPECIAL' | 'OTHER';
    location?: string | null;
    color?: string | null;
  }>;
}

export interface SchedulerRequest {
  userId: string;
  targetDate: string; // "YYYY-MM-DD"
  preferences: SchedulerUserPreferences;
  tasks: SchedulerTaskInput[];
  calendarContext?: SchedulerCalendarContext;
  fixedCommitments?: SchedulerFixedCommitment[];
  options?: {
    includeMeals?: boolean;
    includeLeisure?: boolean;
    includeFreeTimeBlocks?: boolean;
    bufferBetweenSessionsMinutes?: number;
  };
}

export interface TimeInterval {
  startMinute: number; // 0 to 1440
  endMinute: number; // 0 to 1440
}

export interface ScheduledBlockOutput {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  blockType: BlockType;
  isFixed: boolean;
  isLocked?: boolean;
  title: string;
  taskId?: string | null;
  eventId?: string | null;
  color?: string | null;
  metadata?: {
    priority?: TaskPriority;
    energyRequirement?: TaskEnergyLevel;
    sessionIndex?: number;
    totalSessions?: number;
    location?: string | null;
    notes?: string | null;
  };
}

export interface ScheduledTaskSummary {
  taskId: string;
  title: string;
  totalAllocatedMinutes: number;
  remainingMinutes: number;
  sessionCount: number;
  isFullyScheduled: boolean;
}

export interface UnscheduledTaskSummary {
  taskId: string;
  title: string;
  estimatedMinutes: number;
  remainingMinutes: number;
  reason: UnscheduledReason;
  details: string;
}

export interface ScheduleMetrics {
  totalDayMinutes: number; // 1440
  sleepMinutes: number;
  wakingMinutes: number;
  totalAvailableWorkMinutes: number;
  totalScheduledWorkMinutes: number;
  totalFixedCommitmentMinutes: number;
  totalBreakAndMealMinutes: number;
  totalLeisureMinutes: number;
  freeTimeRemainingMinutes: number;
  efficiencyScore: number; // 0 to 100
}

export interface ScheduleResult {
  date: string; // "YYYY-MM-DD"
  blocks: ScheduledBlockOutput[];
  scheduledTasks: ScheduledTaskSummary[];
  partiallyScheduledTasks: ScheduledTaskSummary[];
  unscheduledTasks: UnscheduledTaskSummary[];
  metrics: ScheduleMetrics;
}

export interface ISchedulerEngine {
  generateSchedule(request: SchedulerRequest): ScheduleResult;
}

export interface RescheduleRequest {
  currentBlocks: ScheduledBlockOutput[];
  targetDate: string; // "YYYY-MM-DD"
  preferences: SchedulerUserPreferences;
  tasks: SchedulerTaskInput[];
  calendarContext?: SchedulerCalendarContext;
  reason?: string;
  taskModifications?: Array<{
    taskId: string;
    additionalMinutes?: number;
    completed?: boolean;
  }>;
  newEvents?: Array<{
    id?: string;
    title: string;
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    blockType?: 'COLLEGE' | 'EVENT';
    location?: string | null;
  }>;
}

export interface ScheduleDiffItem {
  type: 'ADDED' | 'REMOVED' | 'MOVED' | 'MODIFIED' | 'PRESERVED';
  title: string;
  blockType: BlockType;
  oldTime?: string;
  newTime?: string;
  details?: string;
}

export interface RescheduleResult {
  date: string;
  blocks: ScheduledBlockOutput[];
  diff: ScheduleDiffItem[];
  changelog: string[];
  metrics: ScheduleMetrics;
  unscheduledTasks: UnscheduledTaskSummary[];
}
