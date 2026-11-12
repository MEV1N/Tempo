-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "themePreference" TEXT NOT NULL DEFAULT 'AUTO';
