# Cache App (Chrome extension)

Manifest V3 extension that reads **Instagram Saved**, **TikTok Favorites**, and **YouTube Watch Later** while you are logged in. You can also save **any** open tab as a regular Chrome bookmark, which the extension then syncs to Cache. Metadata is stored in **`chrome.storage.local`**. Content scripts only run on the supported social sites and on the Cache origin.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → choose this folder (`extensions/cache-app`).

## Point the extension at your deployment

1. Edit **`cache-config.js`**: set `CACHE_APP_ORIGIN` to the same origin as `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` (e.g. `https://your-domain.com` in production).
2. Edit **`manifest.json`**:
   - Add a `host_permissions` entry for that origin (e.g. `https://your-domain.com/*`).
   - Duplicate the **Cache site** `content_scripts` block’s `matches` for that origin (same pattern as `http://localhost:3000/*`).
3. Reload the extension in `chrome://extensions`.

The **content script** `cache-site-bootstrap.js` runs only on those origins. It performs a same-origin `GET /api/user/extension-ingest-token` (session cookies included). The app creates an ingest token on first request if needed; the extension stores the token and ingest URL for the service worker.

## Use with the Cache web app

1. **Sign in** to Cache in Chrome (same profile as the extension).
2. **Open any page** on your Cache origin (home, Library, etc.) so the bootstrap script can run once.
3. **Sync** in the popup stays disabled until a Better Auth **session** cookie exists for `CACHE_APP_ORIGIN` **and** the bootstrap has stored a token. Reopen or focus the popup after step 2 if needed.
4. On **Instagram → Saved**, **TikTok → Favorites**, or **YouTube → Watch Later**, click **Sync** to import the whole collection. For **any other tab**, click **Sync** to save the current page as a regular Chrome bookmark; the extension syncs it to Cache just like any other browser bookmark.

**Open Cache** opens `/{defaultLocale}` on `CACHE_APP_ORIGIN` (`en-US` in the popup).

## Architecture overview

- `cache-extension-runtime.js` is the shared runtime contract. It owns message names, shared storage keys, origin and endpoint resolution, and small cross-script helpers. Keep new cross-cutting constants here so popup, worker, and content scripts cannot drift.
- `content.js` is the scraper boundary for Instagram Saved, TikTok Favorites, and YouTube Watch Later. It should only detect pages, collect rows, and emit progress or completion messages back to the extension runtime.
- `cache-site-bootstrap.js` is the Cache-site bridge. It runs only on Cache origins, fetches or relays the ingest token from the signed-in app session, and stores the token in extension storage via the service worker.
- `service-worker.js` is the orchestration boundary. It owns local persistence, Chrome bookmark event ingestion, source-specific merge policies, and all backend POSTs.
- `popup.js` is UI-only. It should read sync metadata, request user-triggered work, and reflect link state, but it should not grow business logic that belongs in the worker.

## Cleanup notes

- Shared message names and storage keys now come from `cache-extension-runtime.js`, which removes repeated string literals across the popup, worker, and content/bootstrap scripts.
- In `service-worker.js`, source-specific persistence is centralized in a single `BOOKMARK_SOURCE_CONFIG` map. Storage versioning, merge behavior, endpoint selection, and backend sync strategy now live together instead of being split across conditionals.
- The popup and Cache-site bridge now resolve hosts and endpoints from shared config instead of mixing config-driven logic with hardcoded `cachd.app` assumptions.

## Server sync guardrails

The service worker skips server POSTs when there is no ingest token or no Cache session cookie for the POST URL’s origin (same idea as the popup).

## Privacy and limitations

- **Personal / best-effort:** Instagram and TikTok UIs change often; selectors may need updates.
- **Account linking:** Visiting Cache while signed in is required so the extension can receive a token; Next.js client navigations after the first load may not re-run the script—refresh or open a new tab if the popup still asks you to visit Cache.
- Respect each platform’s terms; use at your own risk.
