-- AlterEnum
ALTER TYPE "BlockType" ADD VALUE 'ROUTINE';

-- CreateEnum
CREATE TYPE "RoutineCategory" AS ENUM ('SLEEP', 'MEAL', 'EXERCISE', 'MORNING_ROUTINE', 'EVENING_ROUTINE', 'WORK', 'STUDY', 'PERSONAL', 'RELAXATION', 'OTHER');

-- CreateEnum
CREATE TYPE "RoutineClassification" AS ENUM ('FIXED', 'FLEXIBLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "personal_routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RoutineCategory" NOT NULL DEFAULT 'OTHER',
    "classification" "RoutineClassification" NOT NULL DEFAULT 'FIXED',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "daysOfWeek" INTEGER[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_routines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_routines_userId_idx" ON "personal_routines"("userId");

-- CreateIndex
CREATE INDEX "personal_routines_userId_isEnabled_idx" ON "personal_routines"("userId", "isEnabled");

-- AddForeignKey
ALTER TABLE "personal_routines" ADD CONSTRAINT "personal_routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

