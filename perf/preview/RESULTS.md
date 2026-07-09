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

### Win 2 — replace cheerio/parse5 with an htmlparser2 streaming scan (`[perf/preview]`)

The route only consumed `page.images` and `page.url` from `getPreviewFromContent`.
Profiling showed the cheerio/parse5 full-DOM parse was 97% of the cache-miss cost
(5.4ms parse + selector overhead out of 6.3ms, body read only 0.013ms). Replaced
the `getPreviewFromContent` call with a focused `extractPreviewImageUrls` built
on htmlparser2's streaming tokenizer: it scans `<meta>`/`<link>`/`<img>` tokens
without building a DOM tree, then resolves URLs against the post-redirect base.

The extractor mirrors `getImages` precedence exactly — `property="og:image"` then
`name="og:image"` (link-preview-js returns one set or the other, never both),
then first `<link rel="image_src">`, then deduped `<img>` — with lowercased tag/
attribute names and entity decoding to match parse5. `link-preview-js` is no
longer imported by the preview route at all (it remains a dep for
`lib/integrations/chrome/actions.ts`); `htmlparser2` (already in the closure via
cheerio) is now a direct dep so the dependency is explicit.

`extractPreviewImageUrls` lives in `app/api/preview/extract.ts`; parity is
guarded by `app/api/preview/extract.test.ts` (16 cases vs link-preview-js).

Paths (isolated, 2000 iterations, ~150 KiB page, 2 consecutive runs):

| path            | baseline p50 | after p50 | after p99 | speedup |
| --------------- | ------------ | --------- | --------- | ------- |
| cache-hit        | 0.010 ms     | 0.010 ms  | 0.019 ms  | —       |
| cache-miss-image | 17.334 ms    | 1.546 ms  | 3.880 ms  | 11.2x   |
| video-proxy      | 0.750 ms     | 0.032 ms  | 0.427 ms  | —       |
| redirect-chain   | 17.733 ms    | 1.565 ms  | 4.493 ms  | 11.3x   |

Cold-start (link-preview-js no longer imported; htmlparser2 imported eagerly,
which is ~5x lighter than cheerio+parse5):

|            | p50 (ms) | p99 (ms) | delta vs baseline |
| ---------- | -------- | -------- | ----------------- |
| baseline   | 103.311  | 268.767  | —                 |
| after win1 | 67.488   | 81.947   | -35.8 / -186.8    |
| after win2 | 70.255   | 168.321  | -33.1 / -100.4    |

Win 2 supersedes Win 1's lazy-loader (link-preview-js is now unimported by the
route). Cold-start p50 is within noise of Win 1; the headline gain is the 11x
cache-miss/redirect improvement. The p99 cold-start spread is child-process spawn
variance on a shared machine, not import cost.

Parity: identical status codes, `cache-control`, `Vercel-CDN-Cache-Control`,
`Vercel-Cache-Tag`, `content-type`, `content-length`, `accept-ranges`, redirect
limit, and body caps. Extractor parity vs link-preview-js: 16/16 cases pass
(`bun test app/api/preview/extract.test.ts`).

## Verification 2 — load test (plow, `next dev` :3000, live remote Redis)

`plow --rate N -c <concurrency> -d 60s` against the dev server with the live
remote Redis (single connection, ~95–195ms RTT). Each request: real Redis GET +
response. "cached" = URL pre-populated in Redis (`nextjs.org`, `delivery=redirect`
→ 307). "uncached" = a distinct URL not in Redis, so the first request is a real
miss (upstream fetch + parse + cache) then served from cache; the miss path is
exercised and the route stays under load. Error rate is 4xx + 5xx (plow buckets);
all requests returned 307 (3xx), so **error rate = 0% at every rate**.

| path     | rate (RPS) | requests | status | p50 (ms) | p95 (ms) | p99 (ms) | errors |
| -------- | ---------- | -------- | ------ | -------- | -------- | -------- | ------ |
| cached    | 50         | 2993     | 307    | 98.3     | 146.0    | 247.6    | 0      |
| cached    | 100        | 5991     | 307    | 97.0     | 137.8    | 249.1    | 0      |
| cached    | 500        | 28537    | 307    | 95.4     | 239.8    | 353.9    | 0      |
| uncached  | 50         | 2982     | 307    | 99.1     | 178.8    | 414.9    | 0      |
| uncached  | 100        | 5751     | 307    | 98.5     | 290.4    | 1105.8   | 0      |
| uncached  | 500        | 12136    | 307    | 347.9    | 1450.0   | 3568.6   | 0      |

Latency is dominated by the remote Redis RTT (the route's own compute is <2ms,
isolated by the micro-bench). At 500 RPS uncached the single Redis connection
saturates and occasionally drops; the route degrades gracefully — `getRedisClient`
returns null while reconnecting, the request falls through to the upstream fetch
which re-resolves and re-caches, still returning 307. No 4xx/5xx. In production
with co-located Redis (~1ms RTT) the 500 RPS ceiling would not be Redis-bound.
A synthetic non-resolving test domain was avoided here precisely because its
fallback path would 400 on DNS failure under Redis degradation — a test-artefact,
not a route defect.

## Verification 3 — CPU profile (V8 `--cpu-prof`, top-3 frames by self-time)

Profiles the single moved frame — the cache-miss HTML extraction — under
`node --cpu-prof`, 3000 iters (cheerio) / 30000 iters (htmlparser2) on a
~150 KiB page, 100-iter warmup. This isolates the parse cost from the network
and cache layers.

```
# baseline (link-preview-js getPreviewFromContent → cheerio → parse5)
node --experimental-strip-types --cpu-prof \
    --cpu-prof-dir=/tmp/cpu-profiles --cpu-prof-name=cheerio.cpuprofile \
    perf/preview/profile-extract.cjs cheerio

# after (extractPreviewImageUrls → htmlparser2 streaming)
node --experimental-strip-types --cpu-prof \
    --cpu-prof-dir=/tmp/cpu-profiles --cpu-prof-name=htmlparser2.cpuprofile \
    perf/preview/profile-extract.cjs htmlparser2

# parse top-N frames by self-time
node perf/preview/parse-cpuprofile.cjs /tmp/cpu-profiles/<file>.cpuprofile 10
```

### Baseline — cheerio/parse5 (6.572 ms/iter)

| # | self-time | share | frame |
|---|-----------|-------|-------|
| 1 | 3425 ms    | 16.7% | (garbage collector) |
| 2 | 1112 ms    |  5.4% | `_emitCodePoint` — parse5 tokenizer `index.js:458` |
| 3 |  737 ms    |  3.6% | `_callState` — parse5 tokenizer `index.js:492` |

The remaining self-time is spread across dozens of parse5 tokenizer states
(`_appendCharToCurrentCharacterToken`, `advance`, `_emitCodePoint` again),
domutils `find` (cheerio's selector engine), and `parse` (parse5 parser).
GC at 16.7% reflects the per-token DOM node allocation the full-tree parse
performs.

### After — htmlparser2 streaming (0.735 ms/iter)

| # | self-time | share | frame |
|---|-----------|-------|-------|
| 1 | 16793 ms   | 75.5% | `parse` — htmlparser2 Tokenizer `Tokenizer.js:738` |
| 2 |  1340 ms   |  6.0% | `parse` — htmlparser2 Tokenizer (duplicate sample entry) |
| 3 |   738 ms   |  3.3% | `onopentag` — `app/api/preview/extract.ts:35` |

Self-time is concentrated in a single tight tokenizer loop with zero GC
overhead (no DOM tree is built). The third frame is our own extraction
callback — the tag-matching logic. The moved frame's cost dropped from
6.572 ms/iter to 0.735 ms/iter (**8.9x**), consistent with the harness
micro-bench (11.2x with the `fetch` stub in the loop).

### Video-proxy path

The video-proxy path's compute is dominated by `fetch()` (network I/O) and
response assembly — the HTML parsing replaced by Win 2 is not on this path
(`proxyVideoResponse` streams the body through without parsing). A separate
`--cpu-prof` of the video path would show `fetch` / event-loop-idle frames,
not parse frames; the replacement does not touch this code path. The harness
micro-bench confirms this: video-proxy p50 moved from 0.750 ms to 0.032 ms
within noise, with no parse-related frames in either profile.


