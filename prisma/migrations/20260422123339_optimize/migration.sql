-- DropIndex
DROP INDEX "account_userId_idx";

-- CreateIndex
CREATE INDEX "account_userId_providerId_idx" ON "account"("userId", "providerId");
