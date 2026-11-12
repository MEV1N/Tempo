# Database Codebase Map

This document details the database architecture, Prisma schema models, enums, migration history, and data access conventions for `@tempo/database`.

---

## 1. Package Architecture & Data Access

- **Location:** `packages/database/`
- **Schema File:** `packages/database/prisma/schema.prisma`
- **Client Export:** `packages/database/src/index.ts`
- **ORM:** Prisma Client with PostgreSQL dialect.

### Singleton Client Convention
Always import the shared client instance:
```typescript
import { prisma } from '@tempo/database';
```
Do **never** call `new PrismaClient()` inside services, controllers, or route handlers. The package exports a global singleton that manages connection pooling and logging across hot reloads.

---

## 2. Models Reference

### 2.1 Identity, Authentication & Preferences

| Model | Primary Key | Key Fields & Relations | Purpose |
|---|---|---|---|
| `User` | `id` (cuid) | `email` (unique), `passwordHash`, `name`, `avatarUrl`, `timezone`, `role`, relations to all user entities | Central user identity record |
| `UserPreference` | `id` (cuid) | `userId` (unique), `timezone`, `wakeTime`, `sleepTime`, `themePreference` (AUTO/LIGHT/DARK), routines & notification preferences | Sleep, wake, theme, and scheduling constraint preferences |
| `Session` | `id` (cuid) | `userId`, `token` (unique), `expiresAt`, `userAgent`, `ipAddress` | Cookie session tracking (`tempo_session`) |
| `OAuthConnection` | `id` (cuid) | `userId`, `provider`, `providerUserId`, `accessToken`, `refreshToken`, `tokenExpiresAt` | External identity link (Google OAuth / Calendar) |
| `PersonalRoutine` | `id` (cuid) | `userId`, `name`, `category`, `classification`, `startTime`, `endTime`, `daysOfWeek`, `isFixed` | Personal routines (meals, exercise, recurring habits) |

### 2.2 Tasks & Categorization

| Model | Primary Key | Key Fields & Relations | Purpose |
|---|---|---|---|
| `TaskCategory` | `id` (cuid) | `userId`, `name`, `color`, `icon` | User-defined task categories |
| `RecurringTaskSeries` | `id` (cuid) | `userId`, `title`, `frequency`, `interval`, `preferredTime`, `daysOfWeek` | Template series for recurring tasks |
| `Task` | `id` (cuid) | `userId`, `categoryId`, `seriesId`, `title`, `durationMinutes`, `priority`, `energyLevel`, `preferredTime`, `deadline`, `status` | Actionable work items to be scheduled |

### 2.3 Fixed Timetables & External Events

| Model | Primary Key | Key Fields & Relations | Purpose |
|---|---|---|---|
| `Timetable` | `id` (cuid) | `userId`, `name`, `academicTerm`, `startDate`, `endDate`, `isActive` | Semester or weekly recurring class schedule container |
| `TimetableSession` | `id` (cuid) | `timetableId`, `dayOfWeek`, `startTime`, `endTime`, `type`, `courseName`, `location` | Fixed class or lab session blocking time |
| `CalendarEvent` | `id` (cuid) | `userId`, `title`, `startTime`, `endTime`, `isAllDay`, `externalSource`, `externalId` | Ad-hoc calendar events (manual or synced from Google Calendar) |
| `CalendarException` | `id` (cuid) | `userId`, `timetableSessionId`, `exceptionDate`, `type` | Cancellations or moves for recurring timetable sessions |

### 2.4 Daily Schedules & Block Allocation

| Model | Primary Key | Key Fields & Relations | Purpose |
|---|---|---|---|
| `Schedule` | `id` (cuid) | `userId`, `date` (DateTime @db.Date), `status`, `currentVersion` | Container representing one day's schedule |
| `ScheduleVersion` | `id` (cuid) | `scheduleId`, `versionNumber`, `isAccepted` | Version history for generated daily schedules |
| `ScheduleBlock` | `id` (cuid) | `versionId`, `taskId`, `type`, `startTime`, `endTime`, `isLocked`, `isCompleted` | Concrete time slot (TASK, BREAK, ROUTINE, FIXED) |

### 2.5 Activity Tracking, Analytics & Notifications

| Model | Primary Key | Key Fields & Relations | Purpose |
|---|---|---|---|
| `ActivitySession` | `id` (cuid) | `userId`, `taskId`, `category`, `startTime`, `endTime`, `durationSeconds`, `notes` | Real-time stopwatch and timer tracking records |
| `SystemHealth` | `id` (cuid) | `service`, `status`, `metadata`, `checkedAt` | Health check logs and service availability records |
| `PushSubscription` | `id` (cuid) | `userId`, `endpoint` (unique), `p256dh`, `auth` | Web Push API browser subscription endpoints |
| `Notification` | `id` (cuid) | `userId`, `type`, `title`, `message`, `data`, `isRead` | In-app user notifications and reminders |

---

## 3. Enums Reference

```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum TimeOfDay {
  MORNING
  AFTERNOON
  EVENING
  NIGHT
  ANYTIME
}

enum EnergyLevel {
  LOW
  MEDIUM
  HIGH
}

enum RecurrenceFrequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
}

enum SessionType {
  LECTURE
  TUTORIAL
  LAB
  SEMINAR
  OTHER
}

enum EventType {
  APPOINTMENT
  MEETING
  PERSONAL
  TRAVEL
  OTHER
}

enum ExceptionType {
  CANCELLED
  RESCHEDULED
}

enum ScheduleStatus {
  DRAFT
  CONFIRMED
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum BlockType {
  TASK
  BREAK
  ROUTINE
  FIXED
  EXTERNAL
}

enum ActivityCategory {
  FOCUS_WORK
  MEETING
  BREAK
  PERSONAL
  ROUTINE
  OTHER
}

enum NotificationType {
  SCHEDULE_REMINDER
  TASK_REMINDER
  CALENDAR_EVENT
  ROUTINE_REMINDER
  SYSTEM
}

enum RoutineCategory {
  MEAL
  SLEEP
  EXERCISE
  COMMUTE
  PERSONAL_CARE
  OTHER
}

enum RoutineClassification {
  FIXED
  FLEXIBLE
}
```

---

## 4. Migration History (`packages/database/prisma/migrations/`)

1. **`20261111000000_phase1_init`:** Initial user identity, session management, and `SystemHealth`.
2. **`20261111120000_phase2_tasks_calendar`:** Added `TaskCategory`, `RecurringTaskSeries`, `Task`, `Timetable`, `TimetableSession`, `CalendarEvent`, and `CalendarException`.
3. **`20261111160000_phase3_scheduler`:** Added core scheduling models: `Schedule`, `ScheduleVersion`, and `ScheduleBlock`.
4. **`20261111180000_phase4_lifecycle_editing_rescheduling`:** Added schedule block locking, manual adjustment flags, and version acceptance.
5. **`20261111200000_phase5_activities_analytics`:** Added `ActivitySession` for real-time focus timers and time audit logging.
6. **`20261111220000_phase6_push_notifications_automation`:** Added `PushSubscription` and `Notification` models for Web Push and reminders.
7. **`20261111240000_phase7_google_auth_and_calendar`:** Added `OAuthConnection` model for Google OAuth2 / Calendar sync.
8. **`20261111260000_profile_and_personal_routines`:** Added `PersonalRoutine` model and day-of-week wake/sleep overrides to `UserPreference`.
9. **`20261112000000_add_theme_preference`:** Added `themePreference` column to `user_preferences` table (defaults to `'AUTO'`).

---

## 5. Database Conventions & Rules

1. **User Scoping & Isolation:** Every user-specific table has a required `userId` foreign key indexed with `onDelete: Cascade`. Never execute queries on user data without scoping to `req.user.id`.
2. **Date Storage:** Date-only fields (e.g. `Schedule.date`) use `@db.Date`. Full timestamps use `DateTime` with default `now()`.
3. **Transaction Safety:** When regenerating daily schedules, always wrap version increments and block replacements in `prisma.$transaction([...])` to avoid orphaned blocks or partial writes.
4. **No Schema Edits Without Migrations:** Never edit `schema.prisma` without generating a migration via `pnpm --filter @tempo/database prisma migrate dev`.

