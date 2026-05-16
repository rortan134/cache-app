# ADR 0002: Seeded Paused Built-In Automations

## Status

Accepted

## Context

Cache needs built-in automation affordances that are visible immediately after
signup without running background AI work before the user chooses a schedule and
payload behavior.

## Decision

Seed one paused automation row per built-in template on Better Auth
`user.create.after`. The unique key is `[userId, templateKey]`, so each user has
at most one `smart_collections` and one `weekly_digest` built-in. Paused
built-ins are unscheduled until enabled.

Enabling captures the browser timezone plus explicit local time and any
weekday/month-day anchor. Resuming Smart collections resets its prospective
baseline by setting `activatedAtUtc` to the resume time.

## Consequences

Built-ins use the same list, edit, pause, resume, run history, and deletion
surfaces as custom automations. There is no separate template state machine.
Because there are no production users yet, signup-only seeding is sufficient for
V1.
