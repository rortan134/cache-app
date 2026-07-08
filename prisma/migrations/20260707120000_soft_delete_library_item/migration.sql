-- Switch library item deletion to a 30-day tombstone cycle.
-- A non-null `deletedAt` means the item is in Recently deleted and excluded
-- from every live read path; item rows persist until purged by
-- `lib/collections/service.ts:purgeExpiredLibraryItems`. The
-- `(userId, deletedAt)` index serves both the trashed listing and the lazy
-- purge sweep.

ALTER TYPE "LibraryActivityEventKind" ADD VALUE IF NOT EXISTS 'item_deleted';
ALTER TYPE "LibraryActivityEventKind" ADD VALUE IF NOT EXISTS 'item_restored';
ALTER TYPE "LibraryActivityEventKind" ADD VALUE IF NOT EXISTS 'item_purged';

ALTER TABLE "library_item" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "library_item_userId_deletedAt_idx" ON "library_item"("userId", "deletedAt");
