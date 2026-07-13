# Architecture

High-level notes for areas where the design is non-obvious. Prefer reading the
code and its neighboring tests; this file only records the seams that are easy
to miss.

## Preview proxy (`app/api/preview`)

`GET /api/preview?url=&type=image|video&delivery=proxy|redirect` resolves a
bookmark URL to a preview image or video and either **proxies** the bytes or
**redirects** (307) to the upstream asset.

### Request flow

```text
GET /api/preview
  ├─ parse target (sync: length, standalone URL, http/https)
  ├─ type=video
  │    ├─ L1 memory → Redis GET cobalt-preview:<sha16>  → hit → proxy|redirect
  │    ├─ isCobaltHost? else 404
  │    ├─ parsePublicHttpUrl (SSRF DNS check)
  │    └─ resolveCobaltPreview (lazy import) → L1+Redis (async write) → proxy|redirect
  └─ type=image (default)
       ├─ L1 memory → Redis GET preview-image:<sha16> → hit → signed-URL grace → proxy|redirect
       ├─ parsePublicHttpUrl (SSRF DNS check)
       └─ resolveImagePreview
            ├─ TikTok → oEmbed thumbnail
            ├─ else fetch page (manual redirects, max 3)
            │    ├─ if body is already a supported image MIME → use URL as image
            │    └─ else stream body (≤2 MiB) → extractPreviewImageUrls (lazy)
            └─ L1+Redis (async write) → proxy|redirect
```

### Hot path vs cold modules

| Module | When loaded | Why |
| --- | --- | --- |
| `lib/common/redis` | **first cache op** (dynamic import) | ~90% of prior cold-start; not on static import graph |
| process L1 Maps | always (tiny) | warm hit skips Redis RTT |
| `lib/common/server-net` | first public-URL check | SSRF DNS |
| `./extract` (htmlparser2) | **image cache-miss HTML only** | lazy; not on hit/video |
| `cobalt/service` | **video cache-miss only** | lazy; `isCobaltHost` stays static |
| `link-preview-js` | **never** (route) | replaced by `extract.ts`; still used by chrome paste action |

### Caching

| Layer | Key / bound | TTL | Value |
| --- | --- | --- | --- |
| L1 (process Map, max 256, LRU) | same key string as Redis | 300s | `ResolvedImage` or video URL string |
| Redis `preview-image:<sha256(url)[0:16]>` | shared | 300s | `{ imageUrl, pageUrl }` JSON |
| Redis `cobalt-preview:<sha256(url)[0:16]>` | shared | 300s | video URL string |

L1 is checked before Redis on every read and populated on Redis hit / resolve.
Redis **writes are fire-and-forget** after L1 is updated so miss-path latency does
not include a remote Redis RTT. A concurrent request that races the write
re-resolves (same as a cold L1).

Browser `Cache-Control`: `max-age=60, s-maxage=300, stale-while-revalidate=60`.
CDN: `Vercel-CDN-Cache-Control` max-age 300 + `Vercel-Cache-Tag: preview:{type}:{sha16}`.

Signed image URLs with `x-expires` are treated as expired within 300s of
expiry (`isSignedUrlExpired`) so a cached entry cannot outlive a signed asset.
`isSignedUrlExpired` short-circuits when the URL string lacks `x-expires`
(avoids `new URL` on the common unsigned path).

Benchmarks and load results: `perf/preview/RESULTS.md`. Harness: `bun perf/preview/harness.ts`.

### SSRF and redirects

- `parsePublicHttpUrl` rejects non-http(s), localhost/private literals, and
  hostnames that resolve to non-public-unicast addresses.
- Redirects are followed manually (`redirect: "manual"`, `MAX_REDIRECTS=3`).
  Each **new hostname** in the chain is re-checked via `parsePublicHttpUrl`;
  repeats of a host already validated **in that request** skip a second
  `dns.lookup` (request-scoped set, not a process-wide positive DNS cache —
  the latter would widen DNS-rebinding windows across requests).

### Body / MIME caps

| Cap | Limit |
| --- | --- |
| Metadata HTML body | 2 MiB |
| Proxied image | 10 MiB (`Content-Length` gate) |
| Proxied video | 200 MiB |
| Image MIME | avif, bmp, gif, jpeg, png, webp (no SVG) |
| Video MIME | mp4, quicktime, webm |

