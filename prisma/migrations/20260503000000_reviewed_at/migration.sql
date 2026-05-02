ALTER TABLE "library_item" ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "library_item_userId_reviewedAt_idx" ON "library_item"("userId", "reviewedAt");
