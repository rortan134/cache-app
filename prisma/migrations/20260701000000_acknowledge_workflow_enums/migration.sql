-- Acknowledge enums created by @workflow/world-postgres in the public schema.
-- These enums are owned and managed by Workflow's runtime, not Prisma.
-- They are recorded here so that prisma migrate dev does not flag them as drift.
-- Do not modify or delete -- Workflow manages these at runtime.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'status'
    ) THEN
        CREATE TYPE "status" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'step_status'
    ) THEN
        CREATE TYPE "step_status" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'wait_status'
    ) THEN
        CREATE TYPE "wait_status" AS ENUM ('waiting', 'completed');
    END IF;
END$$;
