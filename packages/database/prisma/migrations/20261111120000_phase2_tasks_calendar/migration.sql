-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'SKIPPED';

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('ANYTIME', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "EnergyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('CLASS', 'LAB', 'BREAK', 'TRAVEL', 'OTHER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('EXAM', 'APPOINTMENT', 'MEETING', 'COMMITMENT', 'SPECIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('HOLIDAY', 'CANCELLED_CLASS', 'EXAM', 'SPECIAL_EVENT', 'OTHER');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "preferredTime" "TimeOfDay" NOT NULL DEFAULT 'ANYTIME',
ADD COLUMN "energyRequirement" "EnergyLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "canSplit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "minSessionMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "recurringSeriesId" TEXT,
ADD COLUMN "recurrenceDate" TEXT;

-- CreateTable
CREATE TABLE "task_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#38bdf8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_task_series" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "preferredTime" "TimeOfDay" NOT NULL DEFAULT 'ANYTIME',
    "energyRequirement" "EnergyLevel" NOT NULL DEFAULT 'MEDIUM',
    "canSplit" BOOLEAN NOT NULL DEFAULT false,
    "minSessionMinutes" INTEGER NOT NULL DEFAULT 30,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'DAILY',
    "interval" INTEGER NOT NULL DEFAULT 1,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_task_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetables" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'College Timetable',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_sessions" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "sessionType" "SessionType" NOT NULL DEFAULT 'CLASS',
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "eventType" "EventType" NOT NULL DEFAULT 'COMMITMENT',
    "location" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_exceptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timetableSessionId" TEXT,
    "date" TEXT NOT NULL,
    "exceptionType" "ExceptionType" NOT NULL DEFAULT 'CANCELLED_CLASS',
    "isFullDay" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_categories_userId_name_key" ON "task_categories"("userId", "name");
CREATE INDEX "task_categories_userId_idx" ON "task_categories"("userId");

-- CreateIndex
CREATE INDEX "recurring_task_series_userId_idx" ON "recurring_task_series"("userId");
CREATE INDEX "recurring_task_series_categoryId_idx" ON "recurring_task_series"("categoryId");

-- CreateIndex
CREATE INDEX "tasks_userId_status_idx" ON "tasks"("userId", "status");
CREATE INDEX "tasks_userId_dueDate_idx" ON "tasks"("userId", "dueDate");
CREATE INDEX "tasks_categoryId_idx" ON "tasks"("categoryId");
CREATE INDEX "tasks_recurringSeriesId_idx" ON "tasks"("recurringSeriesId");
CREATE UNIQUE INDEX "tasks_recurringSeriesId_recurrenceDate_key" ON "tasks"("recurringSeriesId", "recurrenceDate");

-- CreateIndex
CREATE INDEX "timetables_userId_idx" ON "timetables"("userId");

-- CreateIndex
CREATE INDEX "timetable_sessions_timetableId_idx" ON "timetable_sessions"("timetableId");
CREATE INDEX "timetable_sessions_userId_dayOfWeek_idx" ON "timetable_sessions"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "calendar_events_userId_idx" ON "calendar_events"("userId");
CREATE INDEX "calendar_events_userId_startTime_endTime_idx" ON "calendar_events"("userId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "calendar_exceptions_userId_date_idx" ON "calendar_exceptions"("userId", "date");
CREATE INDEX "calendar_exceptions_timetableSessionId_idx" ON "calendar_exceptions"("timetableSessionId");

-- AddForeignKey
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_task_series" ADD CONSTRAINT "recurring_task_series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_task_series" ADD CONSTRAINT "recurring_task_series_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "task_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "task_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurringSeriesId_fkey" FOREIGN KEY ("recurringSeriesId") REFERENCES "recurring_task_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_exceptions" ADD CONSTRAINT "calendar_exceptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_exceptions" ADD CONSTRAINT "calendar_exceptions_timetableSessionId_fkey" FOREIGN KEY ("timetableSessionId") REFERENCES "timetable_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

