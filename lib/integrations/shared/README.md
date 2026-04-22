# Shared Integration Module

This module holds the cross-integration utilities that multiple integration routes, hooks, and services depend on.

## Responsibilities

- `progress.ts`: library setup progress and syncable integration labels.
- `execution.ts`: client-side execution for open, connect, and sync behaviors.
- `snapshot.ts`: snapshot-style imports that can prune missing items when a sync is complete.
- `extension-ingest.ts`: token-authenticated ingest helpers used by browser and extension-driven imports.
- `library-item-imports.ts`: shared row normalization and upsert payload shaping for snapshot and ingest flows.

## Cleanup Notes

- Consolidated duplicated library-item row construction into `library-item-imports.ts` so snapshot and ingest flows share one persistence shape.
- Standardized import normalization for browser profile ids, external ids, captions, and optional date parsing in the shared server-side import path.
- Reduced repeated upsert payload boilerplate by centralizing create/update builders used by both import flows.
- Simplified progress helpers by removing repeated set-to-array conversions and loosening an over-coupled heading helper signature.
- Tightened client execution helpers with shared redirect handling, safer JSON error parsing for sync responses, and named integration errors instead of generic throws.

## Behavior Guardrails

- Snapshot imports still own pruning behavior and only delete missing items when `snapshotComplete` is `true`.
- Ingest upsert counts and smart-collection item detection remain based on the existing caller-visible contract.
