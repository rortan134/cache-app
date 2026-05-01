CREATE TYPE "LibraryActivityEventKind" AS ENUM (
    'collection_created',
    'collection_shared',
    'item_added',
    'item_collected',
    'item_updated',
    'source_connected'
);

CREATE TABLE "library_activity_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "LibraryActivityEventKind" NOT NULL,
    "libraryItemId" TEXT,
    "collectionId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_activity_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "library_activity_event_userId_occurredAt_idx" ON "library_activity_event"("userId", "occurredAt");
CREATE INDEX "library_activity_event_libraryItemId_idx" ON "library_activity_event"("libraryItemId");
CREATE INDEX "library_activity_event_collectionId_idx" ON "library_activity_event"("collectionId");

ALTER TABLE "library_activity_event"
    ADD CONSTRAINT "library_activity_event_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "library_activity_event"
    ADD CONSTRAINT "library_activity_event_libraryItemId_fkey"
    FOREIGN KEY ("libraryItemId") REFERENCES "library_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "library_activity_event"
    ADD CONSTRAINT "library_activity_event_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
