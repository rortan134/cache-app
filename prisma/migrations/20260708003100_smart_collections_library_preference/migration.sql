-- Smart collections is no longer an automation. It is a per-user library
-- preference (`user.smartCollectionsEnabled`) backed by the event-driven
-- classifier that runs on every save. This migration:
--   1. Adds the new column, defaulting to false so existing users must opt in
--      (matches the previous seeded-automation default of `paused`).
--   2. Negative-migrates any existing user whose `smart_collections` automation
--      was `active`: they had explicitly opted in, so preserve that intent.
--   3. Drops the seeded `smart_collections` automations and their pending runs.
--   4. Removes `smart_collections` from the `AutomationTemplateKey` enum by
--      recreating the type with only `weekly_digest` left.

-- 1. Add the new user preference column, defaulting to off.
ALTER TABLE "user"
  ADD COLUMN "smartCollectionsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- 2. Preserve explicit opt-ins from existing users whose seeded
-- smart_collections automation was active. Any user with no row or a
-- paused row gets the default (false), matching the prior paused default.
UPDATE "user"
SET "smartCollectionsEnabled" = TRUE
WHERE id IN (
  SELECT "userId"
  FROM "automation"
  WHERE "templateKey" = 'smart_collections'
    AND status = 'active'
);

-- 3. Delete pending runs and the automations themselves for the
-- smart_collections template. AutomationRun rows cascade on delete.
DELETE FROM "automation_run"
WHERE "automationId" IN (
  SELECT id FROM "automation" WHERE "templateKey" = 'smart_collections'
);

DELETE FROM "automation"
WHERE "templateKey" = 'smart_collections';

-- 4. Recreate the AutomationTemplateKey enum without smart_collections.
-- PostgreSQL cannot DROP VALUE from an enum in place, so we swap the type.
ALTER TABLE "automation"
  ALTER COLUMN "templateKey" DROP DEFAULT,
  ALTER COLUMN "templateKey" TYPE TEXT USING "templateKey"::text;

ALTER TABLE "automation_run"
  ALTER COLUMN "templateKeySnapshot" TYPE TEXT USING "templateKeySnapshot"::text;

DROP TYPE "AutomationTemplateKey";

CREATE TYPE "AutomationTemplateKey" AS ENUM (
  'weekly_digest'
);

ALTER TABLE "automation"
  ALTER COLUMN "templateKey" TYPE "AutomationTemplateKey"
    USING "templateKey"::text::"AutomationTemplateKey",
  ALTER COLUMN "templateKey" DROP DEFAULT;

ALTER TABLE "automation_run"
  ALTER COLUMN "templateKeySnapshot" TYPE "AutomationTemplateKey"
    USING "templateKeySnapshot"::text::"AutomationTemplateKey",
  ALTER COLUMN "templateKeySnapshot" DROP DEFAULT;

-- The unique(userId, templateKey) index and Prisma-generated model indices
-- operate on the column value alone, not on a type-specific operator class,
-- so the enum type swap leaves them untouched.
