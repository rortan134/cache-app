ALTER TABLE "library_item" ADD COLUMN "favoritedAt" TIMESTAMP(3);
CREATE INDEX "library_item_userId_favoritedAt_idx" ON "library_item"("userId", "favoritedAt");
