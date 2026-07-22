-- Expand built-in automation templates:
--   1. Rename weekly_digest → daily_digest (title/prompt when still defaults).
--   2. Add worth_revisiting and next_actions.
--   3. Seed the new templates for every existing user (paused, matching signup).

-- 1. Detach enum columns so we can rename values and add new ones.
ALTER TABLE "automation"
  ALTER COLUMN "templateKey" DROP DEFAULT,
  ALTER COLUMN "templateKey" TYPE TEXT USING "templateKey"::text;

ALTER TABLE "automation_run"
  ALTER COLUMN "templateKeySnapshot" TYPE TEXT USING "templateKeySnapshot"::text;

-- 2. Rename the weekly digest template identity and default copy.
UPDATE "automation"
SET
  "templateKey" = 'daily_digest',
  "title" = CASE
    WHEN "title" = 'Weekly Digest' THEN 'Daily Digest'
    ELSE "title"
  END,
  "prompt" = CASE
    WHEN "prompt" = 'Create a concise weekly digest of the most useful saved items. Group related ideas, call out what deserves attention, and include practical next steps.'
      THEN 'Create a concise daily digest of the most useful items saved recently. Group related ideas, call out what deserves attention today, and include practical next steps.'
    ELSE "prompt"
  END
WHERE "templateKey" = 'weekly_digest';

UPDATE "automation_run"
SET "templateKeySnapshot" = 'daily_digest'
WHERE "templateKeySnapshot" = 'weekly_digest';

-- 3. Recreate the enum with the full template set.
DROP TYPE "AutomationTemplateKey";

CREATE TYPE "AutomationTemplateKey" AS ENUM (
  'daily_digest',
  'worth_revisiting',
  'next_actions'
);

ALTER TABLE "automation"
  ALTER COLUMN "templateKey" TYPE "AutomationTemplateKey"
    USING "templateKey"::text::"AutomationTemplateKey",
  ALTER COLUMN "templateKey" DROP DEFAULT;

ALTER TABLE "automation_run"
  ALTER COLUMN "templateKeySnapshot" TYPE "AutomationTemplateKey"
    USING "templateKeySnapshot"::text::"AutomationTemplateKey",
  ALTER COLUMN "templateKeySnapshot" DROP DEFAULT;

-- 4. Seed the two new built-ins for every user who does not already have them.
INSERT INTO "automation" (
  "id",
  "userId",
  "templateKey",
  "title",
  "prompt",
  "status",
  "payloadScope",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  u.id,
  t.template_key::"AutomationTemplateKey",
  t.title,
  t.prompt,
  'paused'::"AutomationStatus",
  'all_library_items'::"AutomationPayloadScope",
  NOW(),
  NOW()
FROM "user" u
CROSS JOIN (
  VALUES
    (
      'worth_revisiting',
      'Worth Revisiting',
      'Find older saved items that still deserve attention. Prefer unfinished, high-value, or easy-to-act-on saves. Explain why each is worth revisiting and suggest one concrete next step.'
    ),
    (
      'next_actions',
      'Next Actions',
      'Scan recent saves and notes for open loops. Extract concrete next actions, group them by theme, and rank by impact or urgency. Skip fluff.'
    )
) AS t(template_key, title, prompt)
WHERE NOT EXISTS (
  SELECT 1
  FROM "automation" a
  WHERE a."userId" = u.id
    AND a."templateKey" = t.template_key::"AutomationTemplateKey"
);
