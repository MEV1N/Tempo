-- AlterTable users: make passwordHash nullable for Google OAuth users
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable calendar_events: add Google Calendar sync fields
ALTER TABLE "calendar_events"
  ADD COLUMN "googleEventId" TEXT,
  ADD COLUMN "googleCalendarId" TEXT,
  ADD COLUMN "etag" TEXT,
  ADD COLUMN "isGoogleEvent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "googleRecurringEventId" TEXT;

-- CreateIndex for Google Calendar Event Lookup
CREATE INDEX "calendar_events_userId_googleEventId_idx" ON "calendar_events"("userId", "googleEventId");

-- CreateTable oauth_connections
CREATE TABLE "oauth_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "picture" TEXT,
    "scope" TEXT,
    "encryptedRefreshToken" TEXT,
    "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "calendarSyncToken" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_connections_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "oauth_connections_provider_providerId_key" ON "oauth_connections"("provider", "providerId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "oauth_connections_userId_provider_key" ON "oauth_connections"("userId", "provider");

-- CreateIndex
CREATE INDEX "oauth_connections_userId_idx" ON "oauth_connections"("userId");

-- AddForeignKey
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

