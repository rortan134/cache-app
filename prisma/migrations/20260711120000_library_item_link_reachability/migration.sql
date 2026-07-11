-- AlterEnum
CREATE TYPE "LibraryItemLinkReachability" AS ENUM ('reachable', 'unreachable', 'ambiguous', 'skipped');

-- AlterTable
ALTER TABLE "library_item" ADD COLUMN "linkReachability" "LibraryItemLinkReachability",
ADD COLUMN "linkCheckedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "library_item_userId_linkReachability_idx" ON "library_item"("userId", "linkReachability");
