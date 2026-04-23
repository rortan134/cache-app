---
name: animate-text
description: Curated text animation catalog with exact JSON specs for headings, labels, counters, and text swaps. Use when an agent needs to pick or translate named effects like soft blur in, typewriter, shared axis, line reveal, stagger, crossfade, or kinetic builds into WAAPI, Motion, Framer Motion, GSAP, CSS, Lottie, Rive, or similar stacks.
disable-model-invocation: true
---

# Animate Text

Use this skill as a text animation catalog backed by canonical `spec.json` files.

For visible website effects, each spec also carries a `site_reference` block that explains the additional renderer, playback, runtime, and stage adjustments needed to match the current site version exactly.

This skill ships 24 specs in total. The website currently showcases 20 of them.

## When To Use

Use this skill when the request involves:

- animating headings, labels, counters, editorial copy, or text swaps
- matching a named effect id such as `soft-blur-in`, `typewriter`, `shared-axis-y`, or `kinetic-center-build`
- choosing a motion pattern from a curated catalog and translating it into a target stack
- reproducing the current website showcase behavior in another stack without relying on example components

## Workflow

1. Determine whether the user wants:
   - the exact site version of a visible effect
   - a portable translation of the motion contract
2. If the user names an effect id, read `assets/specs/<id>.json` or run `node scripts/get-spec.mjs <id>`.
3. Otherwise use `references/catalog.md` or optionally run:
   - `node scripts/list-specs.mjs`
   - `node scripts/find-spec.mjs "<query>"`
4. Use the top-level spec fields for the portable motion contract.
5. If the spec includes `site_reference`, treat that block as the authoritative guide for reproducing the current website version.
6. If the request includes text replacement, treat `swap` as the portable contract and `site_reference.playback` as the exact website playback behavior.

## Bundled Resources

- `references/catalog.md`: compact summary of the bundled spec library
- `references/schema.md`: field-level schema for canonical spec JSON files
- `references/selection-guide.md`: heuristics for picking the right effect family
- `references/implementation-notes.md`: translation notes for common animation stacks
- `assets/specs/*.json`: canonical spec contracts, including `site_reference` for visible website effects
- `assets/catalog.json`: visible website catalog order and renderer overrides
- `assets/samples.json`: sample copy used by the website showcase

## Optional Helper Scripts

The helper scripts are optional deterministic shortcuts. They require Node.js 20+.

- `node scripts/list-specs.mjs` prints bundled spec metadata as JSON
- `node scripts/get-spec.mjs <id>` prints one exact bundled spec as JSON
- `node scripts/find-spec.mjs "<query>"` returns likely matches ranked by metadata

If Node is unavailable, the core skill still works through the Markdown references and JSON assets alone.

## Translation Rules

- Preserve `target` exactly: `whole`, `per-character`, `per-word`, or `per-line`.
- Map `enter` and `exit` durations, easing, and stagger directly into the target stack.
- Preserve transform, opacity, blur, scale, rotation, and spacing fields when the target stack supports them.
- For layout-aware effects such as `kinetic-center-build` or `short-slide-down`, use the `build` block and notes in `usage_notes` to preserve the choreography rather than flattening them into a generic stagger.
- For exact website-example reproduction, preserve the `site_reference.renderer`, `site_reference.playback`, `site_reference.runtime`, and `site_reference.stage` fields from the spec.
- Read `site_reference.reproduction_notes` carefully when present. Those notes describe the extra site-specific transformations that are required for visual parity.

## Notes

- The public website uses a curated subset of the bundled library. The skill can still use additional bundled specs that are not currently visible on the website.
- `assets/specs/*.json` are the authoritative public contracts.
- There is no separate public `effect.json` or example-component layer. Exact website reproduction data lives inside the spec's `site_reference` block.
- Visible website effects carry a `site_reference` block inside the spec. Hidden effects may set `site_reference` to `null`.
- If a prose note conflicts with a JSON field, prefer the JSON.
