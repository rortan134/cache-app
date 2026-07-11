# Common utilities (`lib/common`)

Cross-cutting helpers any part of the app may import. Stay **domain-agnostic**: no product workflows, no feature-specific models, no assumptions about a single route or UI surface. Feature-only code belongs next to that module. Each module should be self-contained.

This folder is a grab bag of unrelated concerns, grouped for reasoning — not by runtime package boundaries. Layout is modular themes, not a closed catalog.

Helper libraries and wrappers around external dependencies (platforms, drawing, networking, etc.) are essential: never talk directly to what you do not control; wrap and abstract.

## When to use or extend

- Prefer importing an existing helper before copying logic into a feature folder.
- Add here when the same primitive would plausibly serve multiple areas (even if only one caller exists today).
- Keep surface areas small: one clear responsibility per module, stable names, types that do not leak feature vocabulary.

## Themes (representative, not exhaustive)

### Observability and failure

Scoped logging, redaction helpers, structured errors with schema-backed payloads. Keep diagnostics consistent and failures typed.

### Environment and UI plumbing

SSR-safe DOM checks, environment detection, wrappers for `localStorage` / `sessionStorage`, Tailwind class merging, glue between framework/runtime quirks and app code.

### Data shapes and text

Object utilities, shared TypeScript helpers, string and URL handling — pure data in, pure data out.

### Concurrency, caching, and control flow

Memoization, keyed caches, retries, abort helpers, small Promise utilities — orchestrates time or reuse without knowing what is fetched.

### Network-adjacent and integration edges

URL normalization/validation, optional reachability checks, thin adapters to external services or infrastructure. **Some assume a server context** (headers, secrets, Node-only APIs); read the module header or imports before using from client components.

### Media, color, and binary handling

Color math, layout helpers (aspect, clamping), blob/file helpers, client-side pixel/binary work when the dependency graph allows it.

## Runtime boundaries

- Not every file is isomorphic.
- Before importing into Client Components, route handlers, or services, confirm whether the module touches `window`, Node-only globals, or environment variables.
- When in doubt, follow existing import sites or split server-only logic behind a clearly named leaf module.
