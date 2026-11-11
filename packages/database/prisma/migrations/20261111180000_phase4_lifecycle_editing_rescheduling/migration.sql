-- DropIndex
DROP INDEX IF EXISTS "schedules_userId_date_status_key";

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "schedule_blocks" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "schedules_userId_date_status_idx" ON "schedules"("userId", "date", "status");

-- CreateTable
CREATE TABLE "schedule_versions" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "ScheduleStatus" NOT NULL,
    "changeReason" TEXT,
    "metrics" JSONB,
    "unscheduledTasks" JSONB,
    "blocksSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_versions_scheduleId_idx" ON "schedule_versions"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_versions_userId_idx" ON "schedule_versions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_versions_scheduleId_versionNumber_key" ON "schedule_versions"("scheduleId", "versionNumber");

-- AddForeignKey
ALTER TABLE "schedule_versions" ADD CONSTRAINT "schedule_versions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_versions" ADD CONSTRAINT "schedule_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

