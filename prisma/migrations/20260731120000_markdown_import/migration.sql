-- AlterEnum
ALTER TYPE "LibraryItemSource" ADD VALUE IF NOT EXISTS 'markdown_import';

-- CreateTable
CREATE TABLE "markdown_import" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markdown_import_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "markdown_import_userId_name_key" ON "markdown_import"("userId", "name");
CREATE INDEX "markdown_import_userId_idx" ON "markdown_import"("userId");

-- AddForeignKey
ALTER TABLE "markdown_import"
    ADD CONSTRAINT "markdown_import_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
