# Common utilities (`lib/common`)

Cross-cutting helpers and small libraries that any part of the app may import. Code here should stay **domain-agnostic**: no product workflows, no feature-specific models, and no assumptions about a single route or UI surface. When something is only meaningful to one vertical (collections, billing, auth, and so on), it belongs next to that module instead. Each module should be self-contained.

This folder is intentionally a **grab bag** of unrelated concerns, grouped only by how agents and humans reason about them—not by runtime package boundaries. New files may appear as needs grow; treat the layout as modular themes, not a closed catalog.

Helper libraries and wrappers around external dependencies (platforms, drawing, networking, etc.) are essential; never talk directly to what you don’t control, always wrap and abstract.

---

## When to use or extend `lib/common`

- Prefer importing an existing helper before copying logic into a feature folder.
- Add here when the same primitive would plausibly serve **multiple** areas of the codebase (even if only one caller exists today).
- Keep surface areas small: one clear responsibility per module, stable names, and types that do not leak feature vocabulary.

---

## Themes (representative, not exhaustive)

### Observability and failure

Scoped logging, redaction helpers, and structured errors with schema-backed payloads. Use these to keep diagnostics consistent and failures typed rather than ad hoc strings.

### Environment and UI plumbing

SSR-safe DOM checks, environment detection, wrappers around different platforms such as `localStorage` / `sessionStorage`, Tailwind class merging, and other glue that sits between framework/runtime quirks and application code.

### Data shapes and text

Object utilities, shared TypeScript helpers, string and URL handling, and similar “pure data in, pure data out” building blocks.

### Concurrency, caching, and control flow

Memoization, keyed caches, retries, abort helpers, and small Promise utilities — anything that orchestrates time or reuse without knowing *what* is being fetched.

### Network-adjacent and integration edges

Normalization and validation of URLs, optional reachability checks for remote assets, and thin adapters to external services or infrastructure (for example caching backends or third-party APIs). **Some of these assume a server context** (headers, secrets, Node-only APIs); read the module header or imports before using from client components.

### Media, color, and binary handling

Color math, layout helpers (aspect, clamping numeric ranges), blob/file helpers, and client-side work that touches pixels or binary data when the dependency graph allows it.

---

## Runtime boundaries

Not every file is isomorphic. Before importing into React Client Components, route handlers, or services, confirm whether the module touches `window`, Node-only globals, or environment variables. When in doubt, follow existing import sites in the repo or split server-only logic behind a clearly named leaf module.
