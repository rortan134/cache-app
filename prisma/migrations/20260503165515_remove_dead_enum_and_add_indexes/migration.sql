-- DropEnum
DROP TYPE "CollectionTemplate";

-- CreateIndex
CREATE INDEX "account_providerId_accountId_idx" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "subscription_referenceId_idx" ON "subscription"("referenceId");

-- CreateIndex
CREATE INDEX "user_stripeCustomerId_idx" ON "user"("stripeCustomerId");
