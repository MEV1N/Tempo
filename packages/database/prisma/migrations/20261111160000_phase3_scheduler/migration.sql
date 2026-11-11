-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('TASK', 'COLLEGE', 'EVENT', 'MEAL', 'BREAK', 'LEISURE', 'BUFFER', 'FREE_TIME');

-- AlterTable
ALTER TABLE "schedule_blocks" ADD COLUMN "scheduleId" TEXT,
ADD COLUMN "eventId" TEXT,
ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "blockType" "BlockType" NOT NULL DEFAULT 'TASK',
ADD COLUMN "metadata" JSONB;

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PROPOSED',
    "metrics" JSONB,
    "unscheduledTasks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedules_userId_date_idx" ON "schedules"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_userId_date_status_key" ON "schedules"("userId", "date", "status");

-- CreateIndex
CREATE INDEX "schedule_blocks_scheduleId_idx" ON "schedule_blocks"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_blocks_taskId_idx" ON "schedule_blocks"("taskId");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

