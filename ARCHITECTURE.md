# Architecture

High-level notes for areas where the design is non-obvious. Prefer reading the
code and its neighboring tests; this file only records the seams that are easy
to miss.

## Preview proxy (`app/api/preview`)

`GET /api/preview?url=&type=image|video&delivery=proxy|redirect` resolves a
bookmark URL to a preview image or video and either **proxies** the bytes or
**redirects** (307) to the upstream asset.

### Request flow

```
GET /api/preview
  ├─ parse target (sync: length, standalone URL, http/https)
  ├─ type=video
  │    ├─ Redis GET cobalt-preview:<sha16>  → hit → proxy|redirect
  │    ├─ isCobaltHost? else 404
  │    ├─ parsePublicHttpUrl (SSRF DNS check)
  │    └─ resolveCobaltPreview (lazy import) → cache → proxy|redirect
  └─ type=image (default)
       ├─ Redis GET preview-image:<sha16> → hit → signed-URL grace → proxy|redirect
       ├─ parsePublicHttpUrl (SSRF DNS check)
       └─ resolveImagePreview
            ├─ TikTok → oEmbed thumbnail
            ├─ else fetch page (manual redirects, max 3)
            │    ├─ if body is already a supported image MIME → use URL as image
            │    └─ else stream body (≤2 MiB) → extractPreviewImageUrls (lazy)
            └─ cache ResolvedImage → proxy|redirect
```

### Hot path vs cold modules

| Module | When loaded | Why |
| --- | --- | --- |
| `lib/common/redis` | first cache op | always on success path |
| `lib/common/server-net` | first public-URL check | SSRF DNS |
| `./extract` (htmlparser2) | **image cache-miss HTML only** | lazy; not on hit/video |
| `cobalt/service` | **video cache-miss only** | lazy; `isCobaltHost` stays static |
| `link-preview-js` | **never** (route) | replaced by `extract.ts`; still used by chrome paste action |

### Caching

| Key | TTL | Value |
| --- | --- | --- |
| `preview-image:<sha256(url)[0:16]>` | 300s | `{ imageUrl, pageUrl }` JSON |
| `cobalt-preview:<sha256(url)[0:16]>` | 300s | video URL string |

Browser `Cache-Control`: `max-age=60, s-maxage=300, stale-while-revalidate=60`.
CDN: `Vercel-CDN-Cache-Control` max-age 300 + `Vercel-Cache-Tag: preview:{type}:{sha16}`.

Signed image URLs with `x-expires` are treated as expired within 300s of
expiry (`isSignedUrlExpired`) so a cached entry cannot outlive a signed asset.

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

