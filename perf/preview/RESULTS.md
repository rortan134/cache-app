# perf/preview — `app/api/preview/route.ts` performance work

Micro-benchmarks isolate the route's **compute** by stubbing the three external
boundaries it depends on: `globalThis.fetch`, `node:dns/promises.lookup`, and
`redis.createClient` (in-memory). This measures the code we control — query
parsing, cache serialization, redirect loop control, body-size-limit streaming,
content-type gating, cache-tag/CDN header construction, response assembly —
and excludes real DNS, upstream HTTP, and Redis network, which are surfaced by
the load test (plow against `next dev` + live Redis) and the standalone DNS
measurement below.

Runtime: Bun 1.3.14, Node 24.13.0, macOS arm64. Run from repo root:

```
bun perf/preview/harness.ts all        # cold-start + dns + paths
bun perf/preview/harness.ts paths
bun perf/preview/harness.ts cold-start
bun perf/preview/harness.ts dns
```

## Baseline (pre-refactor)

Paths (compute-isolated, 2000 iterations, 200 warmup), realistic ~256 KiB page:

| path            | p50 (ms) | p99 (ms) | req/s   |
| --------------- | -------- | -------- | ------- |
| cache-hit        | 0.010    | 0.038    | 86 406  |
| cache-miss-image | 17.334   | 39.388   | 53      |
| video-proxy      | 0.750    | 2.544    | 1 137   |
| redirect-chain   | 17.733   | 52.811   | 51      |

Cold-start (30 fresh-process imports of `route.ts` transitive closure):

| p50 (ms) | p99 (ms) | min (ms) | max (ms) |
| -------- | -------- | -------- | -------- |
| 103.311  | 268.767  | 93.413   | 268.767  |

DNS lookup (`resolvesToBlockedHostname` per-hop input, 200 samples):

| host        | p50 (ms) | p99 (ms) |
| ----------- | -------- | -------- |
| localhost   | 0.103    | 0.316    |
| github.com  | 0.304    | 0.950    |

Per-redirect-hop SSRF cost (public host): ~0.304 ms p50, ~0.950 ms p99. A
3-hop chain pays this 4 times (initial `parsePublicHttpUrl` + one per hop).

## After

### Win 1 — lazy-load `link-preview-js` (`[perf/preview]`)

`getPreviewFromContent` was imported at module top level, eagerly pulling the
`cheerio` → `parse5` closure into every cold start. It is only used on the
cache-miss image path that parses HTML. Moved to a cached dynamic `import()`
inside `resolveImagePreview`, so cache-hit, video, and redirect paths never
load the closure.

Cold-start (fresh-process import):

|            | p50 (ms) | p99 (ms) | delta vs baseline |
| ---------- | -------- | -------- | ----------------- |
| baseline   | 103.311  | 268.767  | —                 |
| after win1 | 67.488   | 81.947   | -35.8 / -186.8    |

Paths (within noise — the parse still runs on cache-miss, just loads lazily):

| path            | p50 (ms) | p99 (ms) | req/s   |
| --------------- | -------- | -------- | ------- |
| cache-hit        | 0.010    | 0.035    | 89 069  |
| cache-miss-image | 15.609   | 45.278   | 57      |
| video-proxy      | 0.769    | 2.681    | 1 126   |
| redirect-chain   | 17.138   | 25.787   | 56      |

Parity: identical status codes (307/200/400/415/413), `cache-control`,
`Vercel-CDN-Cache-Control`, `Vercel-Cache-Tag`, `content-type`, `content-length`,
`accept-ranges`, redirect limit, and body caps. Verified via the harness
validation fixture.
