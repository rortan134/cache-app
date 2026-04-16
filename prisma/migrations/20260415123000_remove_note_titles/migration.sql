UPDATE "library_item"
SET "caption" = NULL
WHERE "kind" = 'note'
  AND "caption" IS NOT NULL;
