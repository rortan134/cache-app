# Cache Context

## Automation Vocabulary

Automations are user-owned scheduled agents. They contain an instruction prompt,
a payload scope, and a local wall-clock schedule. The database stores schedule
comparisons in UTC, but timezone conversion belongs to automation business logic.

Workflow means Vercel Workflow infrastructure only. Do not use workflow as the
product-domain name for this feature. Routine is marketing copy only and should
not appear in domain types, service names, or persistence models.

## Automations V1

V1 automations are scheduled-only. Users can create custom read-only
automations, enable seeded built-ins, pause them, edit them, and inspect concise
run summaries. There is no manual run, backfill, external delivery destination,
or custom write tool in V1.

Each new user gets two paused built-ins:

- Smart collections: prospectively classifies newly saved items with the
  existing smart-collection classifier after activation.
- Weekly digest: summarizes saved content on a user-chosen schedule.

Active automations require the paid `canUseWorkflows` capability. AI execution
still passes through the same GenAI protection and quota boundaries as the rest
of Cache.

## Scheduling Model

Vercel Cron wakes `/api/cron/automations` every five minutes in UTC. The cron
route authenticates with `CRON_SECRET`, recovers expired `starting` leases,
times out stale `running` runs conservatively, claims due pending runs, and
starts Vercel Workflow with only an `AutomationRun.id`.

The workflow loads snapshots from the claimed run. Custom automations and the
weekly digest receive a small payload manifest and use read-only scoped tools to
page through library items. Smart collections is the only V1 mutation exception.

## Ownership Boundaries

Automation domain code lives under
`lib/collections/intelligence/automations/*`. Next.js server actions are thin
adapters over the service module. Workflow entrypoints stay minimal and should
delegate all business behavior back to the automation module.
