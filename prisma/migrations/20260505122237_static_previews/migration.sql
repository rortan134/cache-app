/*
  Warnings:

  - You are about to drop the `library_item_preview` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "library_item_preview" DROP CONSTRAINT "library_item_preview_libraryItemId_fkey";

-- DropTable
DROP TABLE "library_item_preview";

-- DropEnum
DROP TYPE "LibraryItemPreviewMediaType";

-- DropEnum
DROP TYPE "LibraryItemPreviewProviderStatus";
