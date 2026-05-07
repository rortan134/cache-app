-- CreateIndex
CREATE INDEX "collection_userId_name_idx" ON "collection"("userId", "name");

-- CreateIndex
CREATE INDEX "collection_userId_updatedAt_createdAt_idx" ON "collection"("userId", "updatedAt", "createdAt");

-- CreateIndex
CREATE INDEX "library_activity_event_userId_occurredAt_createdAt_idx" ON "library_activity_event"("userId", "occurredAt", "createdAt");

-- CreateIndex
CREATE INDEX "library_item_userId_scrapedAt_updatedAt_idx" ON "library_item"("userId", "scrapedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "library_item_userId_scrapedAt_updatedAt_reviewedAt_idx" ON "library_item"("userId", "scrapedAt", "updatedAt", "reviewedAt");

-- CreateIndex
CREATE INDEX "subscription_referenceId_periodEnd_idx" ON "subscription"("referenceId", "periodEnd");
