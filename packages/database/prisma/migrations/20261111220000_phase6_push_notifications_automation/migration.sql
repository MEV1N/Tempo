-- AlterTable user_preferences
ALTER TABLE "user_preferences"
  ADD COLUMN "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "autoNightlyPlanningEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyTomorrowPlanReady" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyTaskReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyScheduleReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyScheduleChanges" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "preferredPlanningTime" TEXT NOT NULL DEFAULT '21:00';

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'TOMORROW_PLAN_READY',
  'SCHEDULE_REMINDER',
  'TASK_REMINDER',
  'SCHEDULE_CHANGE',
  'GENERAL'
);

-- CreateTable push_subscriptions
CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "expirationTime" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable notifications
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

