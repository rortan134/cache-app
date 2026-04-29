CREATE TYPE "LibraryItemPreviewMediaType" AS ENUM ('image', 'video', 'gif', 'unknown');

CREATE TYPE "LibraryItemPreviewProviderStatus" AS ENUM ('success', 'unavailable', 'error');

CREATE TABLE "library_item_preview" (
    "id" TEXT NOT NULL,
    "libraryItemId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "staticImageUrl" TEXT,
    "videoPreviewUrl" TEXT,
    "mediaType" "LibraryItemPreviewMediaType" NOT NULL DEFAULT 'unknown',
    "providerStatus" "LibraryItemPreviewProviderStatus" NOT NULL,
    "errorCode" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_item_preview_pkey" PRIMARY KEY ("id")
);

INSERT INTO "library_item_preview" (
    "id",
    "libraryItemId",
    "sourceUrl",
    "staticImageUrl",
    "mediaType",
    "providerStatus",
    "resolvedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('legacy_', "id"),
    "id",
    "url",
    "thumbnailUrl",
    'image'::"LibraryItemPreviewMediaType",
    'success'::"LibraryItemPreviewProviderStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "library_item"
WHERE "thumbnailUrl" IS NOT NULL AND length(trim("thumbnailUrl")) > 0;

CREATE UNIQUE INDEX "library_item_preview_libraryItemId_key" ON "library_item_preview"("libraryItemId");
CREATE INDEX "library_item_preview_providerStatus_idx" ON "library_item_preview"("providerStatus");
CREATE INDEX "library_item_preview_resolvedAt_idx" ON "library_item_preview"("resolvedAt");

ALTER TABLE "library_item_preview"
    ADD CONSTRAINT "library_item_preview_libraryItemId_fkey"
    FOREIGN KEY ("libraryItemId") REFERENCES "library_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "library_item" DROP COLUMN "thumbnailUrl";
