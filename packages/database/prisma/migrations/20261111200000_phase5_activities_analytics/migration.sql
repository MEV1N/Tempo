-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('STUDY', 'COLLEGE', 'WORK', 'PERSONAL', 'EXERCISE', 'LEISURE', 'OTHER');

-- CreateTable
CREATE TABLE "activity_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL DEFAULT 'STUDY',
    "taskId" TEXT,
    "scheduleBlockId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "notes" TEXT,
    "completedAsPlanned" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_sessions_userId_date_idx" ON "activity_sessions"("userId", "date");

-- CreateIndex
CREATE INDEX "activity_sessions_userId_startTime_idx" ON "activity_sessions"("userId", "startTime");

-- CreateIndex
CREATE INDEX "activity_sessions_userId_category_idx" ON "activity_sessions"("userId", "category");

-- CreateIndex
CREATE INDEX "activity_sessions_taskId_idx" ON "activity_sessions"("taskId");

-- CreateIndex
CREATE INDEX "activity_sessions_scheduleBlockId_idx" ON "activity_sessions"("scheduleBlockId");

-- AddForeignKey
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_scheduleBlockId_fkey" FOREIGN KEY ("scheduleBlockId") REFERENCES "schedule_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

