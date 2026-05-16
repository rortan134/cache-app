# ADR 0001: Durable Automation Scheduling

## Status

Accepted

## Context

Cache automations need reliable scheduled execution, but Vercel Cron only wakes
routes on UTC cron expressions and does not provide per-user local timezone
scheduling. Long-running AI work also needs durable execution so retries and
platform restarts do not lose run state.

## Decision

Use Vercel Cron as a five-minute UTC poller for `/api/cron/automations`. Store
each materialized occurrence as an `AutomationRun` with `pending`, `starting`,
`running`, and terminal statuses. The cron route atomically claims due pending
runs with a lease, materializes the next future occurrence for active
automations, and starts Vercel Workflow with the run id only.

Per-user timezone and cadence logic lives in the automation service. Vercel
Workflow is used for durable agent execution, not as the product-domain
abstraction.

## Consequences

The system has at-most-one active run per automation, stable run history, and a
clear recovery path for failed starts and expired leases. Precision is bounded
by the five-minute cron interval. Missed occurrences collapse to one repaired
run before the schedule resumes from the next future occurrence.
