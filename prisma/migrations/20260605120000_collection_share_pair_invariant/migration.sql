UPDATE "collection"
SET
    "shareId" = NULL,
    "sharedAt" = NULL
WHERE
    ("shareId" IS NULL) <> ("sharedAt" IS NULL);

ALTER TABLE "collection"
ADD CONSTRAINT "collection_share_pair_check"
CHECK (
    ("shareId" IS NULL AND "sharedAt" IS NULL)
    OR ("shareId" IS NOT NULL AND "sharedAt" IS NOT NULL)
);
