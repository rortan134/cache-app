-- AlterEnum
ALTER TYPE "LibraryItemSource" ADD VALUE IF NOT EXISTS 'rss_feed';

-- CreateTable
CREATE TABLE "rss_feed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "urlKey" TEXT NOT NULL,
    "title" TEXT,
    "siteUrl" TEXT,
    "description" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rss_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rss_feed_userId_urlKey_key" ON "rss_feed"("userId", "urlKey");
CREATE INDEX "rss_feed_userId_idx" ON "rss_feed"("userId");

-- AddForeignKey
ALTER TABLE "rss_feed"
    ADD CONSTRAINT "rss_feed_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
