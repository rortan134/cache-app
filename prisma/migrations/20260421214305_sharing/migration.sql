/*
  Warnings:

  - A unique constraint covering the columns `[shareId]` on the table `collection` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "collection" ADD COLUMN     "shareId" TEXT,
ADD COLUMN     "sharedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "collection_shareId_key" ON "collection"("shareId");
