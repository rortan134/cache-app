# `/api/preview` performance results

Runtime: **Bun 1.3.14** (harness / cold-start), **Node 24.13.0** (cpu-prof micro),
Next.js dev on `:3000` (plow load). Redis: remote Redis Cloud (`us-east-1`,
~500–600 ms RTT from this machine). Date: **2026-07-14**.

Harness: `bun perf/preview/harness.ts <cold-start|paths|cache-reliability|dns|all>`

---

## 1. Micro-bench (handler-level)

### Cold-start import (`app/api/preview/route.ts`, isolated process)

| | n | p50 | p99 | mean | thru |
| --- | ---: | ---: | ---: | ---: | ---: |
| **Baseline** (static `redis` import) | 30 | **62.25 ms** | 141.39 ms | 64.84 ms | 13.5/s |
| **After** (lazy `import("@/lib/common/redis")`) | 30 | **6.79 ms** | 17.37 ms | 7.21 ms | 61.9/s |
| **Delta** | | **−89%** | −88% | −89% | ×4.6 |

**Rationale:** static graph previously pulled `redis` (~60 ms) on every isolate
boot. Dynamic import moves that cost to first cache op (still required for
success paths, but not on module evaluation).

### Path latency (warm process; remote Redis)

| Path | Baseline p50 | After p50 | Baseline p99 | After p99 | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| cache-hit redirect | 614.25 ms | **0.07 ms** | 618.38 ms | **0.51 ms** | L1 hit after warmup |
| cache-hit proxy | 1262.85 ms | **717.11 ms** | 1433.60 ms | **1010.43 ms** | L1 skips Redis; still fetches image |
| cache-miss image redirect | 1569.14 ms | **1100.67 ms** | 1843.45 ms | **1226.42 ms** | async Redis write |
| video proxy (redis hit) | 775.35 ms | **277.96 ms** | 1597.44 ms | **1128.75 ms** | L1 + cancel body |
| redirect-chain | 2166.32 ms | **1638.13 ms** | 2355.56 ms | **1737.48 ms** | network-bound |

**Improved:** cold-start, cache-hit redirect, cache-hit proxy, cache-miss image,
video proxy, redirect-chain → **6 / 5 required categories** (all listed paths).

Throughput (handler, cache-hit redirect): **1.7/s → 9953/s**.

### DNS (per-redirect-hop cost)

| Host | p50 | p99 |
| --- | ---: | ---: |
| localhost | 0.16 ms | 0.20 ms |
| 127.0.0.1 | ~0 ms | 0.06 ms |
| example.com | 0.58 ms | 0.89 ms |

Same-host multi-hop redirects already skip a second `dns.lookup` (request-scoped
set). Public host hop ≈ **0.6 ms** DNS + fetch RTT.

---

## 2. Load test (plow → Next dev `:3000`)

Target (cached):  
`/api/preview?url=https%3A%2F%2Fexample.com%2Fload-test-seed&delivery=redirect`  
(seeded in Redis + warmed L1).

| Rate | Duration | Count | Status | p50 | p95 | p99 | Error rate |
| ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 50 RPS | 60 s | 2989 | 3xx 2989 | 4.02 ms | 6.32 ms | 10.66 ms | **0** |
| 100 RPS | 60 s | 5919 | 3xx 5919 | 2.69 ms | 3.85 ms | 7.38 ms | **0** |
| 500 RPS | 60 s | 26582 | 3xx 26582 | 1.12 ms | 1.88 ms | 8.47 ms | **0** |
| 50 RPS warm ogp.me | 60 s | 2992 | 3xx 2992 | 4.27 ms | 6.54 ms | 7.78 ms | **0** |

Uncached miss (example.com shell, expected 4xx after resolve): 50 RPS target
collapsed to ~1 RPS effective (remote Redis + upstream ~1 s); **28× 4xx**, no
5xx. Cached paths are the hot path under product load.

Raw plow logs: `perf/preview/load/*.txt`.

---

## 3. CPU profiles

### Route miss + video proxy (`bun --cpu-prof`)

File: `perf/preview/profiles/route-miss-video.cpuprofile`

Top app/lib **self-time** frames (sampled during cache-miss HTML + video proxy):

| Rank | Frame | Where | Role |
| ---: | --- | --- | --- |
| 1 | `IPv4` / ipaddr | `node_modules/ipaddr.js` | SSRF address class on `parsePublicHttpUrl` |
| 2 | `parse` (htmlparser2 Tokenizer) | `htmlparser2` | HTML og:image extract (miss only) |
| 3 | `isSupportedVideoContentType` / `getMimeType` | `route.ts` | MIME gate on proxy |
| 4 | `parsePublicHttpUrl` | `lib/common/net.ts` | SSRF DNS policy |
| 5 | Redis client command path | `@redis/client` | L2 cache (cold L1) |
| 6 | `proxyVideoResponse` / `fetchWithTimeout` | `route.ts` / `timeout.ts` | upstream video tunnel |

**Moved off hot path (evidence):** static `redis` module load and per-hit Redis
RTT no longer dominate warm cache-hit samples (handler p50 0.07 ms; plow p50
~1–4 ms is Next/HTTP overhead). Remaining self-time on miss/proxy is SSRF
(`ipaddr` + DNS), HTML parse, and upstream I/O — correct placement.

### Hot-path pure micro (`node --cpu-prof`)

File: `perf/preview/profiles/CPU.*.cpuprofile`  
Top frames for hash + JSON + `isSignedUrlExpired`: `parse`, `isSignedUrlExpired`,
`digest`/`Hash`, `URL`/`URLSearchParams`. Justifies the `x-expires` substring
short-circuit before `new URL`.

---

## 4. Cache reliability

| Check | Result |
| --- | --- |
| Redis `preview-image` TTL | **299 s** (set EX 300) |
| Redis `cobalt-preview` TTL | **299 s** (set EX 300) |
| Browser `Cache-Control` | `max-age=60, s-maxage=300, stale-while-revalidate=60` (parity) |
| HIT redirect | 307 + `location` + cache tags |
| True MISS (fresh URL) | not 307 (example.com → 404) |
| `isSignedUrlExpired` no param | false |
| far future | false |
| inside grace window | true |
| already past | true |
| just outside grace | false |
| expired signed entry in Redis | treated as miss (not 307) |

Note: goal text “60s preview” maps to **browser max-age=60**; Redis preview TTL
is **300s** (unchanged; matches `PREVIEW_IMAGE_CACHE_TTL_SECONDS`).

---

## 5. Changes landed (with bench that justifies each)

| Change | Bench delta |
| --- | --- |
| Lazy-load `lib/common/redis` | cold-start p50 **62 → 6.8 ms** |
| Process L1 Map (max 256, TTL 300s) before Redis | cache-hit redirect p50 **614 → 0.07 ms**; plow 500 RPS p50 **1.1 ms**, err **0** |
| Fire-and-forget Redis write after L1 set | cache-miss p50 **1569 → 1101 ms** |
| `isSignedUrlExpired` skip when no `x-expires` substring | cpu-prof: avoids `URL` parse on unsigned CDN URLs |

Parity: status codes, headers (`cache-control`, CDN tags), redirect limit 3, body
caps, MIME sets, abort 499 — unchanged by construction; cache reliability +
load 3xx-only on success paths.

---

## 6. Checkpoints

- **Attempt 1:** baseline harness + cold/path/dns/cache numbers (remote Redis
  dominates hit path). Parity OK. Next: lazy redis + L1 + async write.
- **Attempt 2:** lazy redis + L1 + async write + signed short-circuit. Deltas
  positive on all five path categories + cold-start. Parity OK (reliability
  harness). Next: plow + cpu-prof + docs.
- **Attempt 3:** plow 50/100/500 RPS err 0; profiles archived; ARCHITECTURE +
  RESULTS. Lint/typecheck green.

---

## 7. Removed / not retained

- `perf/preview/profile-run.mjs` — scratch for node cpu-prof micro; deleted after
  profile capture (duplicative of harness pure checks).
- No new runtime dependencies.
- Speculative process-wide DNS positive cache **not** added (rebinding risk;
  request-scoped same-host skip already present).
