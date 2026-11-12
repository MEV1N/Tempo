import { z } from 'zod';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: Record<string, any>;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'canceled';

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted?: boolean;
  hasPassword?: boolean;
  googleConnected?: boolean;
}

export interface UserPreferenceDTO {
  id: string;
  userId: string;
  timezone: string;
  wakeTime: string;
  sleepTime: string;
  preferredWorkStart: string;
  preferredWorkEnd: string;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  preferredBreakDuration: number;
  maxContinuousWorkDuration: number;
  dailyLeisureTarget: number;
  onboardingCompleted: boolean;
  pushNotificationsEnabled: boolean;
  autoNightlyPlanningEnabled: boolean;
  notifyTomorrowPlanReady: boolean;
  notifyTaskReminders: boolean;
  notifyScheduleReminders: boolean;
  notifyScheduleChanges: boolean;
  preferredPlanningTime: string;
  themePreference?: 'AUTO' | 'LIGHT' | 'DARK';
  createdAt: string;
  updatedAt: string;
}

export interface TaskDTO {
  id: string;
  userId: string;
  title: string;
  description?: string;
  estimatedDuration: number; // in minutes
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type BlockType =
  'TASK' | 'COLLEGE' | 'EVENT' | 'MEAL' | 'BREAK' | 'LEISURE' | 'BUFFER' | 'FREE_TIME' | 'ROUTINE';

export type ScheduleStatus = 'PROPOSED' | 'CONFIRMED' | 'ARCHIVED';

export interface ScheduleBlockDTO {
  id: string;
  userId: string;
  scheduleId?: string | null;
  taskId?: string | null;
  eventId?: string | null;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  blockType: BlockType;
  isFixed: boolean;
  isLocked: boolean;
  metadata?: any;
  createdAt: string;
}

export interface ScheduleDTO {
  id: string;
  userId: string;
  date: string;
  status: ScheduleStatus;
  version: number;
  metrics: any;
  unscheduledTasks: any;
  blocks: ScheduleBlockDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleVersionDTO {
  id: string;
  scheduleId: string;
  userId: string;
  versionNumber: number;
  status: ScheduleStatus;
  changeReason: string | null;
  metrics?: any;
  unscheduledTasks?: any;
  blocksSnapshot: ScheduleBlockDTO[];
  createdAt: string;
}

export interface AuthResponseData {
  user: UserDTO;
  preference: UserPreferenceDTO | null;
}

// 24-hour time validator: HH:mm (00:00 to 23:59)
export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const timeStringSchema = z
  .string()
  .regex(TIME_REGEX, 'Time must be in 24-hour HH:mm format (e.g. 07:30 or 23:00)');

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  email: z.string().trim().email('Invalid email address').max(255).toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be 128 characters or fewer'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255).toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userPreferenceSchema = z.object({
  timezone: z.string().trim().min(1, 'Timezone is required').default('Asia/Kolkata'),
  wakeTime: timeStringSchema.default('07:00'),
  sleepTime: timeStringSchema.default('23:00'),
  preferredWorkStart: timeStringSchema.default('09:00'),
  preferredWorkEnd: timeStringSchema.default('18:00'),
  breakfastTime: timeStringSchema.default('08:30'),
  lunchTime: timeStringSchema.default('13:00'),
  dinnerTime: timeStringSchema.default('20:30'),
  preferredBreakDuration: z
    .number()
    .int('Break duration must be an integer')
    .min(5, 'Minimum break is 5 minutes')
    .max(120, 'Maximum break is 120 minutes')
    .default(15),
  maxContinuousWorkDuration: z
    .number()
    .int('Max continuous work must be an integer')
    .min(15, 'Minimum continuous work is 15 minutes')
    .max(360, 'Maximum continuous work is 360 minutes')
    .default(90),
  dailyLeisureTarget: z
    .number()
    .int('Daily leisure target must be an integer')
    .min(0, 'Leisure target cannot be negative')
    .max(720, 'Maximum leisure target is 720 minutes')
    .default(120),
  onboardingCompleted: z.boolean().default(false),
  pushNotificationsEnabled: z.boolean().default(true),
  autoNightlyPlanningEnabled: z.boolean().default(true),
  notifyTomorrowPlanReady: z.boolean().default(true),
  notifyTaskReminders: z.boolean().default(true),
  notifyScheduleReminders: z.boolean().default(true),
  notifyScheduleChanges: z.boolean().default(true),
  preferredPlanningTime: timeStringSchema.default('21:00'),
  themePreference: z.enum(['AUTO', 'LIGHT', 'DARK']).default('AUTO'),
});

export type UserPreferenceInput = z.infer<typeof userPreferenceSchema>;

export const updatePreferencesSchema = userPreferenceSchema.partial();
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be 100 characters or fewer')
    .optional(),
  avatarUrl: z.string().trim().url('Invalid URL').max(1000).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const API_ROUTES = {
  HEALTH: '/health',
  API_HEALTH: '/api/health',
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  PREFERENCES: '/api/preferences',
  PROFILE: '/api/profile',
  ROUTINES: '/api/routines',
  CATEGORIES: '/api/categories',
  TASKS: '/api/tasks',
  RECURRING_TASKS: '/api/recurring-tasks',
  TIMETABLES: '/api/timetables',
  CALENDAR_EVENTS: '/api/calendar/events',
  CALENDAR_EXCEPTIONS: '/api/calendar/exceptions',
} as const;

// ==========================================
// PHASE 2: TASK MANAGEMENT & CALENDAR
// ==========================================

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatusType = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'SKIPPED';
export type TimeOfDay = 'ANYTIME' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type SessionType = 'CLASS' | 'LAB' | 'BREAK' | 'TRAVEL' | 'OTHER';
export type EventType = 'EXAM' | 'APPOINTMENT' | 'MEETING' | 'COMMITMENT' | 'SPECIAL' | 'OTHER';
export type ExceptionType = 'HOLIDAY' | 'CANCELLED_CLASS' | 'EXAM' | 'SPECIAL_EVENT' | 'OTHER';

// --- Task Category DTOs & Schemas ---
export interface TaskCategoryDTO {
  id: string;
  userId: string;
  name: string;
  color: string;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(50, 'Category name is too long'),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code (e.g. #38bdf8)')
    .default('#38bdf8'),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// --- Task DTOs & Schemas ---
export interface TaskItemDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  category?: TaskCategoryDTO | null;
  estimatedMinutes: number;
  priority: Priority;
  status: TaskStatusType;
  preferredTime: TimeOfDay;
  energyRequirement: EnergyLevel;
  canSplit: boolean;
  minSessionMinutes: number;
  dueDate: string | null;
  completedAt: string | null;
  recurringSeriesId: string | null;
  recurrenceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  estimatedMinutes: z
    .number()
    .int('Duration must be a whole number')
    .min(5, 'Minimum estimated duration is 5 minutes')
    .max(1440, 'Maximum estimated duration is 24 hours')
    .default(30),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'SKIPPED']).default('TODO'),
  preferredTime: z.enum(['ANYTIME', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']).default('ANYTIME'),
  energyRequirement: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  canSplit: z.boolean().default(false),
  minSessionMinutes: z.number().int().min(5).max(360).default(30),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  recurringSeriesId: z.string().uuid().optional().nullable(),
  recurrenceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().extend({
  completedAt: z.string().datetime({ offset: true }).optional().nullable(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskFilterSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'SKIPPED', 'ALL']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  categoryId: z.string().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  completed: z.enum(['true', 'false']).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'dueDate', 'priority', 'estimatedMinutes', 'title'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;

// --- Recurring Task Series DTOs & Schemas ---
export interface RecurringTaskSeriesDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  category?: TaskCategoryDTO | null;
  estimatedMinutes: number;
  priority: Priority;
  preferredTime: TimeOfDay;
  energyRequirement: EnergyLevel;
  canSplit: boolean;
  minSessionMinutes: number;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number[]; // 1 = Mon ... 7 = Sun
  startDate: string;
  endDate: string | null;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createRecurringTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  estimatedMinutes: z.number().int().min(5).max(1440).default(30),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  preferredTime: z.enum(['ANYTIME', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']).default('ANYTIME'),
  energyRequirement: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  canSplit: z.boolean().default(false),
  minSessionMinutes: z.number().int().min(5).max(360).default(30),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']).default('DAILY'),
  interval: z.number().int().min(1).max(365).default(1),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).default([]),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  generateUntil: z.string().datetime({ offset: true }).optional(),
});
export type CreateRecurringTaskInput = z.infer<typeof createRecurringTaskSchema>;

export const updateRecurringTaskSchema = createRecurringTaskSchema.partial().extend({
  isPaused: z.boolean().optional(),
});
export type UpdateRecurringTaskInput = z.infer<typeof updateRecurringTaskSchema>;

// --- Timetable DTOs & Schemas ---
export interface TimetableSessionDTO {
  id: string;
  timetableId: string;
  userId: string;
  title: string;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string | null;
  description: string | null;
  sessionType: SessionType;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableDTO {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  sessions: TimetableSessionDTO[];
  createdAt: string;
  updatedAt: string;
}

export const createSessionSchema = z
  .object({
    title: z.string().trim().min(1, 'Session title is required').max(100),
    dayOfWeek: z.number().int().min(1, 'Day must be 1 (Monday) to 7 (Sunday)').max(7),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    location: z.string().trim().max(100).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
    sessionType: z.enum(['CLASS', 'LAB', 'BREAK', 'TRAVEL', 'OTHER']).default('CLASS'),
    color: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      return data.startTime < data.endTime;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
    location: z.string().trim().max(100).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
    sessionType: z.enum(['CLASS', 'LAB', 'BREAK', 'TRAVEL', 'OTHER']).optional(),
    color: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const createTimetableSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).default('College Timetable'),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  sessions: z.array(createSessionSchema).optional().default([]),
});
export type CreateTimetableInput = z.infer<typeof createTimetableSchema>;

export const updateTimetableSchema = createTimetableSchema.partial();
export type UpdateTimetableInput = z.infer<typeof updateTimetableSchema>;

// --- Calendar Events DTOs & Schemas ---
export interface CalendarEventDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  eventType: EventType;
  location: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).optional().nullable(),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
    isAllDay: z.boolean().default(false),
    eventType: z
      .enum(['EXAM', 'APPOINTMENT', 'MEETING', 'COMMITMENT', 'SPECIAL', 'OTHER'])
      .default('COMMITMENT'),
    location: z.string().trim().max(200).optional().nullable(),
    color: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      return new Date(data.startTime) <= new Date(data.endTime);
    },
    {
      message: 'Event end time cannot be before start time',
      path: ['endTime'],
    }
  );
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    startTime: z.string().datetime({ offset: true }).optional(),
    endTime: z.string().datetime({ offset: true }).optional(),
    isAllDay: z.boolean().optional(),
    eventType: z
      .enum(['EXAM', 'APPOINTMENT', 'MEETING', 'COMMITMENT', 'SPECIAL', 'OTHER'])
      .optional(),
    location: z.string().trim().max(200).optional().nullable(),
    color: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.startTime) <= new Date(data.endTime);
      }
      return true;
    },
    {
      message: 'Event end time cannot be before start time',
      path: ['endTime'],
    }
  );
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

// --- Calendar Exceptions DTOs & Schemas ---
export interface CalendarExceptionDTO {
  id: string;
  userId: string;
  timetableSessionId: string | null;
  timetableSession?: TimetableSessionDTO | null;
  date: string; // YYYY-MM-DD
  exceptionType: ExceptionType;
  isFullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  title: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createCalendarExceptionSchema = z.object({
  timetableSessionId: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  exceptionType: z
    .enum(['HOLIDAY', 'CANCELLED_CLASS', 'EXAM', 'SPECIAL_EVENT', 'OTHER'])
    .default('CANCELLED_CLASS'),
  isFullDay: z.boolean().default(false),
  startTime: z.string().datetime({ offset: true }).optional().nullable(),
  endTime: z.string().datetime({ offset: true }).optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
});
export type CreateCalendarExceptionInput = z.infer<typeof createCalendarExceptionSchema>;

export const updateCalendarExceptionSchema = createCalendarExceptionSchema.partial();
export type UpdateCalendarExceptionInput = z.infer<typeof updateCalendarExceptionSchema>;

// Unified calendar item for rendering views
export interface CalendarViewItemDTO {
  id: string;
  sourceType: 'TIMETABLE_SESSION' | 'CALENDAR_EVENT' | 'EXCEPTION';
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
  timeDisplay: string; // "09:00 - 10:30"
  date: string; // YYYY-MM-DD
  isAllDay: boolean;
  itemType: string; // CLASS, LAB, EXAM, HOLIDAY, etc.
  color: string;
  location?: string | null;
  description?: string | null;
  sessionId?: string;
  isCancelled?: boolean;
}

export const generateScheduleSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'targetDate must be YYYY-MM-DD'),
  replaceConfirmed: z.boolean().optional(),
  options: z
    .object({
      includeMeals: z.boolean().optional(),
      includeLeisure: z.boolean().optional(),
      includeFreeTimeBlocks: z.boolean().optional(),
      bufferBetweenSessionsMinutes: z.number().int().min(0).max(60).optional(),
    })
    .optional(),
});
export type GenerateScheduleInput = z.infer<typeof generateScheduleSchema>;

export const updateScheduleBlockSchema = z.object({
  startTime: timeStringSchema.optional(),
  endTime: timeStringSchema.optional(),
  durationMinutes: z.number().int().min(5).max(720).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  isLocked: z.boolean().optional(),
  taskId: z.string().uuid().optional().nullable(),
});
export type UpdateScheduleBlockInput = z.infer<typeof updateScheduleBlockSchema>;

export const toggleBlockLockSchema = z.object({
  isLocked: z.boolean().optional(),
});
export type ToggleBlockLockInput = z.infer<typeof toggleBlockLockSchema>;

export const rescheduleSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  taskModifications: z
    .array(
      z.object({
        taskId: z.string(),
        additionalMinutes: z.number().int().min(-720).max(720).optional(),
        completed: z.boolean().optional(),
      })
    )
    .optional(),
  newEvents: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1).max(200),
        startTime: timeStringSchema,
        endTime: timeStringSchema,
        blockType: z.enum(['COLLEGE', 'EVENT']).optional(),
        location: z.string().trim().max(200).optional().nullable(),
      })
    )
    .optional(),
});
export type RescheduleInput = z.infer<typeof rescheduleSchema>;

export const restoreVersionSchema = z.object({
  versionNumber: z.number().int().min(1),
});
export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;

export interface ScheduleDiffItemDTO {
  type: 'ADDED' | 'REMOVED' | 'MOVED' | 'MODIFIED' | 'PRESERVED';
  title: string;
  blockType: BlockType;
  oldTime?: string;
  newTime?: string;
  details?: string;
}

export interface RescheduleResponseDTO {
  schedule: ScheduleDTO;
  diff: ScheduleDiffItemDTO[];
  changelog: string[];
}

// --- Phase 5 Activity Tracking & Productivity Analytics ---
export type ActivityCategory =
  'STUDY' | 'COLLEGE' | 'WORK' | 'PERSONAL' | 'EXERCISE' | 'LEISURE' | 'OTHER';

export interface ActivitySessionDTO {
  id: string;
  userId: string;
  title: string;
  category: ActivityCategory;
  taskId?: string | null;
  taskTitle?: string | null;
  scheduleBlockId?: string | null;
  startTime: string; // ISO
  endTime: string; // ISO
  timeDisplay: string; // "09:00 - 10:30"
  durationMinutes: number;
  date: string; // "YYYY-MM-DD"
  notes?: string | null;
  completedAsPlanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createActivitySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  category: z
    .enum(['STUDY', 'COLLEGE', 'WORK', 'PERSONAL', 'EXERCISE', 'LEISURE', 'OTHER'])
    .default('STUDY'),
  taskId: z.string().uuid().optional().nullable(),
  scheduleBlockId: z.string().uuid().optional().nullable(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  completedAsPlanned: z.boolean().default(true),
});
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = createActivitySchema.partial();
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const activityFilterSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  category: z
    .enum(['STUDY', 'COLLEGE', 'WORK', 'PERSONAL', 'EXERCISE', 'LEISURE', 'OTHER'])
    .optional(),
  taskId: z.string().uuid().optional(),
});
export type ActivityFilterInput = z.infer<typeof activityFilterSchema>;

export interface PlannedVsActualItemDTO {
  title: string;
  category?: string;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  status: 'ON_TRACK' | 'EXCEEDED' | 'SHORT' | 'UNPLANNED' | 'NOT_STARTED';
  taskId?: string | null;
}

export interface PlannedVsActualSummaryDTO {
  date: string;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  differenceMinutes: number;
  plannedVsActualRatio: number;
  tasksCompletedAsPlanned: number;
  tasksExceeded: number;
  tasksNotCompleted: number;
  unplannedActivitiesCount: number;
  items: PlannedVsActualItemDTO[];
}

export interface HeatmapDayDTO {
  date: string;
  count: number;
  totalMinutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  categories: Record<string, number>;
}

export interface ProductivityHeatmapDTO {
  startDate: string;
  endDate: string;
  totalRecordedMinutes: number;
  totalRecordedHours: number;
  totalSessions: number;
  activeDaysCount: number;
  currentStreakDays: number;
  longestStreakDays: number;
  days: HeatmapDayDTO[];
}

export interface CategoryBreakdownDTO {
  category: ActivityCategory;
  totalMinutes: number;
  totalHours: number;
  percentage: number;
}

export interface DailyTrendDTO {
  date: string;
  totalMinutes: number;
  sessionCount: number;
  primaryCategory?: string;
}

export interface ProductivityAnalyticsDTO {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalMinutes: number;
  totalHours: number;
  previousPeriodMinutes: number;
  previousPeriodDeltaMinutes: number;
  percentageChange: number;
  categories: CategoryBreakdownDTO[];
  dailyTrends: DailyTrendDTO[];
  taskPerformance: {
    tasksCompleted: number;
    averageSessionMinutes: number;
    completionRatePercentage: number;
  };
  consistency: {
    activeDays: number;
    totalDaysInPeriod: number;
    consistencyPercentage: number;
    averageDailyMinutes: number;
  };
}

export interface PlannedVsActualItemDTO {
  title: string;
  category?: string;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  status: 'ON_TRACK' | 'EXCEEDED' | 'SHORT' | 'UNPLANNED' | 'NOT_STARTED';
  taskId?: string | null;
}

export interface PlannedVsActualSummaryDTO {
  date: string;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  differenceMinutes: number;
  plannedVsActualRatio: number;
  tasksCompletedAsPlanned: number;
  tasksExceeded: number;
  tasksNotCompleted: number;
  unplannedActivitiesCount: number;
  items: PlannedVsActualItemDTO[];
}

export interface HeatmapDayDTO {
  date: string;
  count: number;
  totalMinutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  categories: Record<string, number>;
}

export interface ProductivityHeatmapDTO {
  startDate: string;
  endDate: string;
  totalRecordedMinutes: number;
  totalRecordedHours: number;
  totalSessions: number;
  activeDaysCount: number;
  currentStreakDays: number;
  longestStreakDays: number;
  days: HeatmapDayDTO[];
}

export interface CategoryBreakdownDTO {
  category: ActivityCategory;
  totalMinutes: number;
  totalHours: number;
  percentage: number;
}

export interface DailyTrendDTO {
  date: string;
  totalMinutes: number;
  sessionCount: number;
  primaryCategory?: string;
}

export interface ProductivityAnalyticsDTO {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  totalMinutes: number;
  totalHours: number;
  previousPeriodMinutes: number;
  previousPeriodDeltaMinutes: number;
  percentageChange: number;
  categories: CategoryBreakdownDTO[];
  dailyTrends: DailyTrendDTO[];
  taskPerformance: {
    tasksCompleted: number;
    averageSessionMinutes: number;
    completionRatePercentage: number;
  };
  consistency: {
    activeDays: number;
    totalDaysInPeriod: number;
    consistencyPercentage: number;
    averageDailyMinutes: number;
  };
}

export const APP_CONFIG = {
  DEFAULT_PORT: 5000,
  CLIENT_PORT: 3000,
  APP_NAME: 'Tempo',
  VERSION: '0.1.0',
  AUTH_COOKIE_NAME: 'tempo_session',
  CSRF_HEADER_NAME: 'x-tempo-csrf',
  SESSION_MAX_AGE_DAYS: 30,
} as const;

// ==========================================
// PHASE 6: PUSH NOTIFICATIONS & AUTOMATION
// ==========================================

export type NotificationType =
  'TOMORROW_PLAN_READY' | 'SCHEDULE_REMINDER' | 'TASK_REMINDER' | 'SCHEDULE_CHANGE' | 'GENERAL';

export interface PushSubscriptionDTO {
  id: string;
  userId: string;
  endpoint: string;
  expirationTime?: string | null;
  createdAt: string;
}

export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint must be a valid URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  expirationTime: z.number().nullable().optional(),
});
export type CreatePushSubscriptionInput = z.infer<typeof createPushSubscriptionSchema>;

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint must be a valid URL'),
});
export type DeletePushSubscriptionInput = z.infer<typeof deletePushSubscriptionSchema>;

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export const notificationFilterSchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
});
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>;

export interface NotificationPreferencesDTO {
  pushNotificationsEnabled: boolean;
  autoNightlyPlanningEnabled: boolean;
  notifyTomorrowPlanReady: boolean;
  notifyTaskReminders: boolean;
  notifyScheduleReminders: boolean;
  notifyScheduleChanges: boolean;
  preferredPlanningTime: string;
}

export const updateNotificationPreferencesSchema = z.object({
  pushNotificationsEnabled: z.boolean().optional(),
  autoNightlyPlanningEnabled: z.boolean().optional(),
  notifyTomorrowPlanReady: z.boolean().optional(),
  notifyTaskReminders: z.boolean().optional(),
  notifyScheduleReminders: z.boolean().optional(),
  notifyScheduleChanges: z.boolean().optional(),
  preferredPlanningTime: timeStringSchema.optional(),
});
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

export interface PlanningStatusDTO {
  autoPlanningEnabled: boolean;
  preferredPlanningTime: string;
  tomorrowDate: string;
  tomorrowPlanStatus: 'READY' | 'CONFIRMED' | 'NO_TASKS' | 'NOT_STARTED';
  scheduleId?: string | null;
  lastPlannedAt?: string | null;
}

export const triggerPlanningSchema = z.object({
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  forceRegenerate: z.boolean().optional().default(false),
});
export type TriggerPlanningInput = z.infer<typeof triggerPlanningSchema>;

// Queue and Job Constants
export const QUEUE_NAMES = {
  BACKGROUND: 'tempo-background-jobs',
  NOTIFICATIONS: 'tempo-notifications',
} as const;

export const JOB_NAMES = {
  NIGHTLY_PLANNING: 'NIGHTLY_PLANNING',
  SCHEDULE_REMINDER: 'SCHEDULE_REMINDER',
  TASK_REMINDER: 'TASK_REMINDER',
  NOTIFICATION_DELIVERY: 'NOTIFICATION_DELIVERY',
  CLEANUP_EXPIRED_DATA: 'CLEANUP_EXPIRED_DATA',
  GOOGLE_CALENDAR_SYNC: 'GOOGLE_CALENDAR_SYNC',
} as const;

export interface NightlyPlanningJobPayload {
  userId: string;
  targetDate: string;
  forceRegenerate?: boolean;
}

export interface ScheduleReminderJobPayload {
  userId: string;
  scheduleBlockId: string;
  title: string;
  scheduledTime: string;
}

export interface TaskReminderJobPayload {
  userId: string;
  taskId: string;
  title: string;
  dueDate: string;
}

export interface NotificationDeliveryJobPayload {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface CleanupExpiredDataJobPayload {
  cutoffDate: string;
}

// ==========================================
// PHASE 7: GOOGLE AUTH & GOOGLE CALENDAR
// ==========================================

export interface OAuthConnectionDTO {
  id: string;
  provider: 'google';
  email: string | null;
  name: string | null;
  picture: string | null;
  calendarConnected: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface GoogleCalendarStatusDTO {
  googleAccountConnected: boolean;
  googleEmail: string | null;
  googleName: string | null;
  googlePicture: string | null;
  calendarConnected: boolean;
  lastSyncedAt: string | null;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  hasPasswordAuth: boolean;
}

export interface GoogleAuthUrlResponseDTO {
  url: string;
  state: string;
}

export const setPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be 128 characters or fewer'),
});
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export interface GoogleCalendarSyncJobPayload {
  userId: string;
  forceFullSync?: boolean;
}

// ==========================================
// PHASE 8: PERSONAL ROUTINES & PROFILE
// ==========================================

export type RoutineCategory =
  | 'SLEEP'
  | 'MEAL'
  | 'EXERCISE'
  | 'MORNING_ROUTINE'
  | 'EVENING_ROUTINE'
  | 'WORK'
  | 'STUDY'
  | 'PERSONAL'
  | 'RELAXATION'
  | 'OTHER';

export type RoutineClassification = 'FIXED' | 'FLEXIBLE';

export interface PersonalRoutineDTO {
  id: string;
  userId: string;
  name: string;
  category: RoutineCategory;
  classification: RoutineClassification;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  durationMinutes: number;
  daysOfWeek: number[]; // 1 = Monday ... 7 = Sunday
  isEnabled: boolean;
  color?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const createRoutineSchema = z.object({
  name: z.string().trim().min(1, 'Routine name is required').max(100),
  category: z
    .enum([
      'SLEEP',
      'MEAL',
      'EXERCISE',
      'MORNING_ROUTINE',
      'EVENING_ROUTINE',
      'WORK',
      'STUDY',
      'PERSONAL',
      'RELAXATION',
      'OTHER',
    ])
    .default('OTHER'),
  classification: z.enum(['FIXED', 'FLEXIBLE']).default('FIXED'),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  durationMinutes: z.number().int().min(5).max(1440).optional(),
  daysOfWeek: z
    .array(z.number().int().min(1).max(7))
    .min(1, 'At least one day must be selected')
    .default([1, 2, 3, 4, 5, 6, 7]),
  isEnabled: z.boolean().default(true),
  color: z.string().trim().max(30).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;

export const updateRoutineSchema = createRoutineSchema.partial();
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;

export const copyRoutinesSchema = z.object({
  fromDay: z.number().int().min(1).max(7),
  toDays: z.array(z.number().int().min(1).max(7)).min(1, 'Select at least one destination day'),
});

export type CopyRoutinesInput = z.infer<typeof copyRoutinesSchema>;

// ==========================================
// TIME FORMATTING UTILITIES (12-HOUR FORMAT)
// ==========================================

/**
 * Formats a 24-hour time string ("HH:mm"), "HH:mm:ss", or ISO timestamp string into a 12-hour format with AM/PM.
 * Examples:
 *   "06:00" -> "6:00 AM"
 *   "12:30" -> "12:30 PM"
 *   "00:00" -> "12:00 AM"
 *   "23:45" -> "11:45 PM"
 * Correctly handles midnight (12:00 AM) and noon (12:00 PM).
 */
export function formatTimeTo12Hour(
  timeStr: string | null | undefined,
  timezone?: string
): string {
  if (!timeStr || typeof timeStr !== 'string') return '';

  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // Check if it's HH:mm or HH:mm:ss
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    if (isNaN(hour)) return trimmed;

    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;

    return `${hour}:${minute} ${period}`;
  }

  // Check if it's an ISO timestamp or date-time string
  if (trimmed.includes('T') || trimmed.includes('-')) {
    try {
      const date = new Date(trimmed);
      if (isNaN(date.getTime())) return trimmed;

      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        ...(timezone ? { timeZone: timezone } : {}),
      };
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Formats start and end times into a 12-hour range string (e.g. "9:00 AM - 10:30 AM")
 */
export function formatTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  timezone?: string
): string {
  const start = formatTimeTo12Hour(startTime, timezone);
  const end = formatTimeTo12Hour(endTime, timezone);
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
}

/**
 * Formats a generic time display string (which may already be a range like "09:00 - 10:30"
 * or a single time "14:00" or special label like "All Day") into 12-hour format with AM/PM.
 */
export function formatTimeDisplayString(
  timeDisplayStr: string | null | undefined,
  timezone?: string
): string {
  if (!timeDisplayStr || typeof timeDisplayStr !== 'string') return '';
  const trimmed = timeDisplayStr.trim();
  if (!trimmed) return '';

  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    if (parts.length === 2) {
      const start = formatTimeTo12Hour(parts[0], timezone);
      const end = formatTimeTo12Hour(parts[1], timezone);
      if (start && end) return `${start} - ${end}`;
    }
  }

  return formatTimeTo12Hour(trimmed, timezone);
}


