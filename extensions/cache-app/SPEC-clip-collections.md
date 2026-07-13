# Spec: Extension clip with collection selection

Status: ready-for-agent  
Local only (not published to the issue tracker)

## Problem Statement

When someone saves a page from the Cache browser extension, they cannot choose which workspace collection(s) it belongs to. The popup only offers bulk social import and Chrome-bookmark-style “import page,” so every intentional save either pollutes Chrome bookmarks or lands uncategorized. Social bulk imports (Instagram Saved, TikTok Favorites, YouTube Watch Later) correctly stay collection-free so Smart Collections can place them en masse — but ordinary sites need the opposite: a deliberate, Cosmos-style “which collections?” moment with the ability to create a collection without leaving the popup.

## Solution

Split extension saving into two product surfaces:

1. **Clip current page** (any non-integration tab): Cosmos-shaped popup — signed-in profile header, search collections, multi-select 0..N collections (or none), **+ New** to create a collection with the same rules as the web create dialog, then **Done** to save. No Chrome bookmark is created. The save uses a first-party `extension_clip` library source and replaces collection membership on re-clip of the same URL.
2. **Social bulk import** (IG / TikTok / YT Watch Later): unchanged import UX; **never** shows a collection picker and never attaches collections, so Smart Collections keeps working on the mass ingest path.
3. **Chrome bookmark tree sync**: unchanged continuous / one-time import; no collection picker.

The server exposes a single bearer-authenticated **Extension Collections & Clip** HTTP surface (list collections, create collection, clip page). The popup is rebuilt with Plasmo + React for this UX; the service worker keeps the existing ingest token for background POSTs. Social scrapers and Chrome sync stay as-is for this work.

## User Stories

1. As a signed-in Cache user, I want to open the extension on a normal webpage and see my collections, so that I can file the page where it belongs.
2. As a signed-in Cache user, I want to select one collection before saving, so that the page lands in that collection.
3. As a signed-in Cache user, I want to select multiple collections before saving, so that one page can live in several organizing contexts.
4. As a signed-in Cache user, I want to save with no collections selected, so that the page still enters my library uncategorized.
5. As a signed-in Cache user, I want re-clipping the same URL to replace the previous collection set with my new selection, so that the popup is the source of truth for that save’s membership.
6. As a signed-in Cache user, I want the popup to remember my last collection selection for the next clip, so that repeated saves to the same projects are fast.
7. As a signed-in Cache user, I want to search/filter my collections list in the popup, so that I can find the right collection when I have many.
8. As a signed-in Cache user, I want each collection row to show its name and item count, so that I can distinguish similar names.
9. As a signed-in Cache user, I want a **+ New** control next to Collections, so that I can create a collection without opening the web app.
10. As a signed-in Cache user, I want the create flow to require a name (max 64) and allow an optional description (max 1024), so that it matches the web create dialog.
11. As a signed-in Cache user, I want template options in create to create immediately (not merely prefill), so that the UX matches the web dialog’s template behavior.
12. As a signed-in Cache user, I want a newly created collection to become selected in the clip list, so that I can save into it without hunting for it.
13. As a signed-in Cache user, I want duplicate collection names to be rejected with a clear message, so that I know to pick another name.
14. As a signed-in Cache user, I want **Done** to clip the active tab’s URL and title/caption into Cache with my selection, so that the page is saved in one action.
15. As a signed-in Cache user, I want clip to **not** create a Chrome bookmark, so that intentional Cache filing does not pollute my browser bookmark bar.
16. As a signed-in Cache user, I want clip saves to use a dedicated library source (`extension_clip`), so that I can tell extension clips apart from Chrome sync and social imports.
17. As a signed-in Cache user with Smart Collections on, I want a clip with **no** collections selected to still be eligible for auto-tagging, so that empty intentional saves can be organized for me.
18. As a signed-in Cache user with Smart Collections on, I want a clip with **any** manual collections to skip auto-tagging for that item, so that my explicit choice is not overridden.
19. As a signed-in Cache user on Instagram Saved / TikTok Favorites / YouTube Watch Later, I want the popup to keep the bulk **Import** experience without a collection picker, so that Smart Collections can place those items en masse.
20. As a signed-in Cache user, I want social bulk imports to never accept or attach collection IDs, so that mass ingest stays source-scoped and classifier-friendly.
21. As a signed-in Cache user, I want continuous Chrome bookmark sync to keep working without collection prompts, so that tree sync stays automatic.
22. As a signed-in Cache user, I want the popup header to show my profile (avatar/name) when linked, so that I know which workspace I am saving into.
23. As a signed-in Cache user, I want light and dark popup styling that matches Cache’s visual language and the Cosmos-like layout (rounded panel, search field, list rows, primary Done), so that the extension feels product-grade.
24. As a signed-in Cache user who is not linked, I want a clear “sign in / open Cache” path, so that I can mint the ingest token and use clip.
25. As a signed-in Cache user, I want failed clip or create calls to show an inline error without closing the popup, so that I can fix and retry.
26. As a signed-in Cache user, I want successful Done to confirm briefly (and close or settle the popup), so that I know the save landed.
27. As a signed-in Cache user, I want collection list fetch to fail safely (empty + error, not a blank crash), so that a network blip does not brick the popup.
28. As a signed-in Cache user, I want only collections I own to be listable/selectable/creatable, so that another user’s IDs cannot be attached.
29. As a signed-in Cache user, I want invalid or foreign collection IDs on clip to be rejected, so that membership stays consistent with my workspace.
30. As a signed-in Cache user, I want re-clip of an existing `extension_clip` URL to upsert the same library identity rather than duplicate rows, so that my library stays clean.
31. As a developer, I want a single bearer-authenticated HTTP surface for list/create/clip, so that the extension does not depend on Server Actions or session cookies in the service worker.
32. As a developer, I want the service worker to keep using the existing ingest token for background POSTs, so that continuous Chrome sync does not regress.
33. As a developer, I want Plasmo only required for the popup (and shared typed runtime as needed), so that social scrapers and the worker are not force-ported in this work.
34. As a developer, I want social and Chrome ingest routes to remain free of collection parameters, so that the product rule “manual collections only on intentional clips” is enforced at the boundary.
35. As a signed-in Cache user, I want keyboard-friendly create (focus name, Enter submits, Escape dismisses when not pending), so that create matches the web dialog’s interaction model.
36. As a signed-in Cache user, I want create-in-progress to block dismiss, so that I do not double-submit or lose the request mid-flight.
37. As a signed-in Cache user on a restricted URL (chrome://, extension pages), I want a clear disabled/unsupported state instead of a failed clip, so that I understand why Done is unavailable.
38. As a signed-in Cache user, I want the active tab’s title and hostname visible in the popup (in addition to or under the profile chrome), so that I know what I am about to save.
39. As a signed-in Cache user, I want templates listed in create to use the same static template catalog as the web app, so that names and descriptions stay consistent across surfaces.
40. As a signed-in Cache user, I want remembered last selection to restore only IDs that still exist after list fetch, so that deleted collections do not appear selected.

## Implementation Decisions

### Product boundaries

- **Clip** is the intentional single-URL save from the popup on non-integration tabs.
- **Social bulk import** and **Chrome bookmark sync** are separate surfaces; they do not gain collection pickers or `collectionIds` on their payloads in this work.
- Social page detection reuses existing host/URL rules (Instagram Saved, TikTok Favorites, YouTube Watch Later). On those pages the popup shows import/sync controls only.
- Clip never creates a Chrome bookmark by default.

### Schema

- Add `extension_clip` to `LibraryItemSource` (prefer new enum values over repurposing existing ones).
- No change to Collection model or the LibraryItem↔Collection M2M.

### Primary API seam: Extension Collections & Clip

Bearer auth via existing extension ingest token resolution. Three operations under one integration-facing surface:

1. **List collections** — returns a thin workspace DTO list suitable for the popup: id, name, priority, item count (and any minimal fields needed for row chrome). Ordered consistently with the web list defaults where practical (e.g. name or updated).
2. **Create collection** — body: name (required), description (optional). Same validation and uniqueness (`nameKey` per user) as web create. No `assignToItemId` on this endpoint; membership is applied only on clip. Templates are client-side: selecting a template calls create with that name/description immediately.
3. **Clip page** — body shape (decision-rich contract):

```ts
{
  url: string
  caption?: string
  collectionIds: string[] // 0..N, owned by user; empty = none
}
```

Clip behavior:

- Authenticate user from bearer token.
- Validate URL; reject non-http(s) where appropriate.
- Upsert one library item with source `extension_clip`, durable identity derived from user + source + stable external id from the normalized URL (same dedupe philosophy as other first-party saves).
- Set collection membership with **replace** semantics (`set` to the provided ids), reusing the existing update-membership service rules (ownership check; reject if any id is missing/foreign).
- Smart Collections: if `collectionIds.length === 0`, include the item in smart-collection scheduling when the user has the preference on; if `collectionIds.length > 0`, **do not** schedule auto-tag for that item on this write.
- Do not create Chrome bookmarks.
- Response: minimal success DTO (item id, applied collection ids/tags, upserted vs created if useful).

Social/Chrome routes: no new collection fields; regression-safe.

### Reuse existing domain services

- Create collection → existing create collection service (name normalize, uniqueness, summary return).
- Membership → existing single-item collection update (replace set).
- List → existing list collections (or a thin projection of it).
- Auth → existing extension ingest token resolve.
- Upsert path → compose with library upsert patterns already used by extension ingest; do not invent a second membership model.

### Extension architecture (Plasmo-first for popup)

- Scaffold Plasmo in the extension package (TypeScript, React, Tailwind as needed for popup only), following the existing migration plan’s ordering: popup first; keep legacy service worker and content scripts until a later port.
- Popup responsibilities: session/link gate, tab context, collection multi-select UI, create sheet, call list/create/clip through the worker or direct host-permitted fetch with stored bearer token (same token storage keys as today).
- Service worker: add thin client methods for the three new endpoints; preserve Instagram/TikTok/YouTube/Chrome POST paths unchanged.
- Content scripts / scrapers: out of scope for rewrite; no collection UI.
- Keep ingest token for background work; do not move continuous sync POSTs onto session cookies.
- Do not import the full web app component tree (Base UI workspace, Lexical, etc.). Mirror create-dialog **behavior** and Cache visual tokens; build a compact popup UI kit.
- Storage: persist last selected collection ids for clip only; after list fetch, intersect with live ids.

### Popup UX (visual contract from product screenshots)

Layout inspired by Cosmos extension (light and dark):

- Compact rounded panel.
- Header: user avatar + display name (and a small workspace/public-style secondary label if available without extra product scope; otherwise omit secondary badge rather than invent sharing semantics).
- Search field filtering the collection list client-side.
- Section label **Collections** with **+ New** on the right.
- Rows: optional accent/thumbnail from name color or existing preview if cheap; name; item count (“N elements” / compact count); multi-select control (checkbox or checkable row — **not** single-select radio, so 0..N remains valid).
- Primary footer action **Done** performs clip with current selection.
- Create overlays or replaces the list with the web-parity form (name, description, templates create-now, pending guard).
- Unsupported tabs: disable Done with explanation.
- Unlinked: prompt to open Cache / sign in so bootstrap can mint the token (until better-auth popup session lands; this work may keep current link gate or adopt session gate if Plasmo popup auth is in the same pass — prefer authoritative session in popup when low-cost, without blocking clip API design).

### Smart Collections interaction

| Path | Collections attached? | Auto-tag |
|------|----------------------|----------|
| Clip, `collectionIds` empty | none | eligible if preference on |
| Clip, `collectionIds` non-empty | replace set | skip for this write |
| Social bulk import | never | existing post-ingest behavior |
| Chrome sync | never | existing post-ingest behavior |

### Remembered selection

- Key: last clip collection id list in extension local storage.
- Restore on popup open for clip mode only.
- Drop ids not present in the latest list response.
- Do not apply remembered ids to social import mode.

### Deduping / identity for clips

- Same normalized URL for the same user under `extension_clip` updates one row (upsert), then replaces collections.
- Caption defaults from tab title when provided.

### Plasmo tooling notes (from project skill)

- MV3, file-based `popup.tsx`, `@plasmohq/storage` acceptable for popup state.
- Messaging optional; existing message/storage enums can be typed as they are ported.
- Build/dev via Plasmo scripts; document load-unpacked path for the Plasmo `build/chrome-mv3-dev` (or equivalent) output.
- Chrome-only remains the target for this work (same as today).

## Testing Decisions

### What good tests look like

- Assert **external behavior** at the Extension Collections & Clip HTTP seam: status codes, response DTOs, DB-visible membership and source, and non-regression on social/Chrome routes.
- Do not assert React component trees, CSS classes, or Plasmo bundler internals.
- Prefer service/route tests consistent with existing integration and collections tests in the repo.

### Modules under test (primary seam)

- List collections (auth required, only owner’s collections, stable DTO).
- Create collection (validation, duplicate name, success summary).
- Clip: none / one / many collections; replace on re-clip; ownership failure; smart-collections scheduling only when empty selection; source is `extension_clip`; no Chrome bookmark side effects.
- Social and Chrome ingest routes still reject or simply ignore collection fields if somehow sent (or remain schema-free of them); bulk import still produces no manual membership from this feature.

### Prior art

- Extension ingest route auth and CORS patterns.
- Collections create and `updateLibraryItemCollections` service tests / usage.
- Upsert + `smartCollectionItemIds` behavior in library import pipeline.

### Manual / exploratory (not automated in this seam)

- Popup multi-select, search, + New, light/dark appearance against the product screenshots.
- Social page mode hides picker.
- Remembered selection restore after restart.

## Out of Scope

- Porting social content scrapers or the full service worker to Plasmo.
- Firefox/Safari packaging.
- Adding collection pickers to Instagram/TikTok/YouTube or Chrome continuous sync.
- Creating Chrome bookmarks from clip (including an “also add to Chrome” toggle).
- Sharing, priority editing, rename, delete, Notion export, or favorites from the popup.
- Full better-auth session rewrite beyond what the popup needs to gate “signed in” (ingest token remains for worker POSTs).
- Instagram Saved sub-albums / multi-folder social models.
- Changing Smart Collections classifier models or batch backfill.
- Pulling the web app’s full collections sidebar or Base UI into the extension bundle.
- Chrome Web Store listing polish beyond what is required to load the Plasmo build unpacked/dev.

## Further Notes

- Visual reference: Cosmos-style popup (profile header, search, collection rows with counts, + New, Done) in light and dark; Cache brand tokens and Plain Speech / Cache Voice for copy.
- Web create dialog parity is behavioral (fields, limits, templates-create-now, pending close guard), not a pixel-perfect port of the library sidebar dialog.
- `MIGRATION.md` remains the longer-term port order; this spec is the product slice that justifies the Plasmo popup first.
- If clip identity via URL collides with a future “multiple clips of same URL with different notes” product, revisit external id strategy; for this work one row per user per normalized URL under `extension_clip` is correct.
- Recommended implementation order: (1) schema + API seam + tests, (2) worker thin clients, (3) Plasmo popup clip UX, (4) create sheet + templates + remember selection, (5) social-mode gate and polish.
