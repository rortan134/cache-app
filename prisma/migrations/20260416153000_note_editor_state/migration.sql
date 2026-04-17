ALTER TABLE "library_item"
ADD COLUMN IF NOT EXISTS "noteContentState" JSONB;
