-- Auth and billing rows should not be guessed away during schema deploy.
-- Fail with a precise duplicate count so production data can be reconciled
-- intentionally before uniqueness becomes enforced.
DO $$
DECLARE
    duplicate_key_count integer;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_key_count
    FROM (
        SELECT 1
        FROM "account"
        GROUP BY "providerId", "accountId"
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_key_count > 0 THEN
        RAISE EXCEPTION
            'Cannot create account(providerId, accountId) unique index: % duplicate key(s) exist',
            duplicate_key_count;
    END IF;
END $$;

-- Change "account" providerId/accountId index to a unique constraint
DROP INDEX IF EXISTS "account_providerId_accountId_idx";
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

DO $$
DECLARE
    duplicate_key_count integer;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_key_count
    FROM (
        SELECT 1
        FROM "subscription"
        WHERE "stripeSubscriptionId" IS NOT NULL
        GROUP BY "stripeSubscriptionId"
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_key_count > 0 THEN
        RAISE EXCEPTION
            'Cannot create subscription(stripeSubscriptionId) unique index: % duplicate key(s) exist',
            duplicate_key_count;
    END IF;
END $$;

-- Create unique index on "stripeSubscriptionId" for "subscription"
CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

DO $$
DECLARE
    duplicate_key_count integer;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_key_count
    FROM (
        SELECT 1
        FROM "subscription"
        WHERE status IN ('incomplete', 'trialing', 'active', 'past_due')
        GROUP BY "referenceId"
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_key_count > 0 THEN
        RAISE EXCEPTION
            'Cannot create subscription(referenceId) active-status unique index: % duplicate key(s) exist',
            duplicate_key_count;
    END IF;
END $$;

-- Create a partial unique index on "referenceId" for open statuses
CREATE UNIQUE INDEX "subscription_referenceId_active_idx" ON "subscription"("referenceId")
WHERE status IN ('incomplete', 'trialing', 'active', 'past_due');
