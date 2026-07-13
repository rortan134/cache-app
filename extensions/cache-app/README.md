# Cache Chrome extension

Clip any page into a Cache collection, with bulk import for Instagram Saved, TikTok Favorites, and YouTube Watch Later and continuous Chrome bookmark sync.

## Build

The popup is a Plasmo + React 19 app; the service worker, content scripts, and Cache site bridge remain vanilla JS for now.

```bash
# from the extensions/cache-app directory
bun install
bun dev        # plasmo dev — hot reload into a loaded unpacked extension
bun build      # plasmo build && node ./scripts/merge-legacy.mjs
```

`bun build` runs Plasmo's production build, then `scripts/merge-legacy.mjs` overlays the legacy `service-worker.js`, `content.js`, `cache-site-bootstrap.js`, and runtime config into `build/chrome-mv3-prod/` and rewrites the merged manifest so the Plasmo-generated `action.default_popup` is preserved and the legacy background/content_scripts/web_accessible_resources are re-injected.

## Load unpacked

1. Run `bun build` (or `bun dev`).
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. **Load unpacked** and choose `extensions/cache-app/build/chrome-mv3-prod` (production) or `extensions/cache-app/build/chrome-mv3-dev` (dev build).

For dev workflow with hot reload: run `bun dev` from `extensions/cache-app/`, then load unpacked from `build/chrome-mv3-dev`. Plasmo watches for changes and re-bundles.

## Point the extension at your deployment

Set `CACHE_APP_ORIGIN` in `cache-config.js` to the same origin as `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` (for local dev: `https://localhost:3000`). Add a matching `host_permissions` entry and the matching Cache site `content_scripts` block to `package.json` under `manifest` (Plasmo merges these into the built manifest). Reload the extension.

## Clip UX

On a normal webpage, the popup shows your collections in a compact panel:

- **Header**: avatar, display name, and a small control to open Cache.
- **Search**: filters your collections by name.
- **Collections** with **+ New**: multi-select 0..N collections (checkboxes). **+ New** opens an inline create form with name (required), optional description, and templates that create immediately.
- **Done**: clips the active tab's URL and title into Cache under the selected collections. Re-clipping the same URL replaces its collection membership. Last selection is remembered for the next clip.
- **Unsupported tabs** (chrome://, about:, extension pages): the popup explains that the page cannot be clipped.
- **Tab closed in Cache?** The popup's unlinked state tells you to open Cache once so the ingest token can mint.

Smart Collections rules:
- Clip with **no** collections selected: eligible for auto-tagging.
- Clip with **any** collection selected: auto-tagging is skipped for that write (your explicit choice wins).

If you do not link the browser first (by signing in to Cache so the bootstrap script stores an ingest token), the popup shows the unlinked state instead of the clip UI.

## Social bulk import

On **Instagram Saved**, **TikTok Favorites**, and **YouTube Watch Later**, the popup keeps the existing single **Import to Cache** button — no collection picker. Smart Collections organize those en masse once they land.

## Link the browser

1. Sign in to Cache in Chrome.
2. Open any page on your Cache origin (home, Library, etc.) so `cache-site-bootstrap.js` runs once and stores the ingest token in `chrome.storage.local`.
3. Reopen the popup — the clip UI appears. If it still says unlinked, refresh or open a fresh Cache tab so the bootstrap script runs.

## Architecture

- `src/popup.tsx` and `src/collection-create-view.tsx` are the Plasmo React popup. They call `lib/api.ts` (list collections, create collection, clip page) with the stored bearer token.
- `lib/runtime.ts` exports the typed contract used by the popup: `STORAGE_KEYS`, `MESSAGE_TYPES`, `isSocialImportUrl`, `isUnsupportedClipUrl`, `getConfiguredCacheAppOrigin`, and endpoint builders.
- `lib/templates.ts` is the same static template catalog as the web create dialog.
- `cache-extension-runtime.js` remains the shared vanilla runtime contract for the service worker, content scripts, and Cache site bridge.
- `content.js` is the social scraper boundary.
- `cache-site-bootstrap.js` is the Cache-site bridge that mints the ingest token from a signed-in session.
- `service-worker.js` is the orchestration boundary for local persistence, Chrome bookmark event ingestion, source-specific merge, and all background POSTs.
- Legacy `popup.html`, `popup.js`, and `popup.css` are left in place (not referenced by the merged manifest); they can be removed in a later cleanup pass.

## Privacy and limitations

- Personal / best-effort: Instagram and TikTok UIs change often; selectors may need updates.
- Account linking: visiting Cache while signed in is required so the extension receives a token. Next.js client navigations after the first load may not re-run the bootstrap—refresh or open a new Cache tab if the popup still asks you to link.
- Respect each platform's terms; use at your own risk.
