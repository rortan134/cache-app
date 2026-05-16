CREATE TYPE "AutomationStatus" AS ENUM ('active', 'paused');

CREATE TYPE "AutomationPayloadScope" AS ENUM ('all_library_items', 'collection');

CREATE TYPE "AutomationCadence" AS ENUM ('daily', 'weekly', 'monthly');

CREATE TYPE "AutomationTemplateKey" AS ENUM ('smart_collections', 'weekly_digest');

CREATE TYPE "AutomationRunStatus" AS ENUM ('pending', 'starting', 'running', 'succeeded', 'failed', 'skipped', 'canceled');

CREATE TABLE "automation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateKey" "AutomationTemplateKey",
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'paused',
    "payloadScope" "AutomationPayloadScope" NOT NULL DEFAULT 'all_library_items',
    "collectionId" TEXT,
    "collectionNameSnapshot" TEXT,
    "cadence" "AutomationCadence",
    "timezone" TEXT,
    "timeOfDayMinutes" INTEGER,
    "weekDay" INTEGER,
    "monthDay" INTEGER,
    "nextRunAtUtc" TIMESTAMP(3),
    "activatedAtUtc" TIMESTAMP(3),
    "lastRunAtUtc" TIMESTAMP(3),
    "lastSucceededAtUtc" TIMESTAMP(3),
    "lastFailureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_run" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledForUtc" TIMESTAMP(3) NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'pending',
    "workflowRunId" TEXT,
    "leaseId" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "summaryMarkdown" TEXT,
    "sources" JSONB,
    "usage" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "templateKeySnapshot" "AutomationTemplateKey",
    "payloadScopeSnapshot" "AutomationPayloadScope" NOT NULL,
    "collectionIdSnapshot" TEXT,
    "collectionNameSnapshot" TEXT,
    "promptSnapshot" TEXT NOT NULL,
    "scheduleSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_run_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_userId_templateKey_key" ON "automation"("userId", "templateKey");
CREATE INDEX "automation_status_nextRunAtUtc_idx" ON "automation"("status", "nextRunAtUtc");
CREATE INDEX "automation_userId_status_idx" ON "automation"("userId", "status");
CREATE INDEX "automation_userId_collectionId_idx" ON "automation"("userId", "collectionId");

CREATE UNIQUE INDEX "automation_run_automationId_scheduledForUtc_key" ON "automation_run"("automationId", "scheduledForUtc");
CREATE INDEX "automation_run_status_scheduledForUtc_idx" ON "automation_run"("status", "scheduledForUtc");
CREATE INDEX "automation_run_automationId_createdAt_idx" ON "automation_run"("automationId", "createdAt");
CREATE INDEX "automation_run_userId_createdAt_idx" ON "automation_run"("userId", "createdAt");

ALTER TABLE "automation"
    ADD CONSTRAINT "automation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation"
    ADD CONSTRAINT "automation_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "automation_run"
    ADD CONSTRAINT "automation_run_automationId_fkey"
    FOREIGN KEY ("automationId") REFERENCES "automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_run"
    ADD CONSTRAINT "automation_run_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
