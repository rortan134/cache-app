/*
  Warnings:

  - A unique constraint covering the columns `[referenceId]` on the table `subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "subscription_referenceId_active_idx";

-- CreateIndex
CREATE UNIQUE INDEX "subscription_referenceId_active_idx" ON "subscription"("referenceId") WHERE (status IN ('incomplete', 'trialing', 'active', 'past_due'));
