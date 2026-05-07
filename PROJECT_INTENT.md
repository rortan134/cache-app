# Cache - Project Intent & Architectural Overview

**Generated from codebase analysis** — *Last updated: May 2026*

---

## 1. What is Cache?

**Cache** is a personal knowledge management application that serves as a unified library for content you've saved across the web. The core thesis, from the manifesto:

> *"Meaning isn't in the feed. It's in what you choose to keep."*
> *"Cache is not a cure. It's a memory."*
> *"You're already paying attention. Cache makes sure it compounds."*

It's designed for people who save content at scale and don't want their "later" to become a graveyard of forgotten bookmarks.

---

## 2. Core Value Proposition

Cache solves the fragmentation problem: your saves are scattered across Chrome, X, YouTube, TikTok, Instagram, Pinterest, GitHub, and everywhere else. Cache pulls them into **one searchable, organized place**.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-source import** | Sync/import from Chrome bookmarks, Twitter/X, YouTube Watch Later, TikTok, Instagram, Pinterest saves, GitHub starred repos, Google Photos, and the Cache browser extension |
| **Unified library** | Single source of truth for all saved content regardless of origin |
| **Collections** | User-created organization units for grouping items |
| **Smart Collections** | AI-assisted organization that helps separate actionable content from inspiration |
| **Rich notes** | First-party note-taking with Lexical rich text editor (stored as HTML + JSON state) |
| **Full-text search + OCR** | Search across all saved content, including image-based text |
| **Review workflow** | A "review" workflow for content that hasn't entered active use yet |
| **Public sharing** | Collections can be shared publicly via stable shareId URLs |
| **Activity timeline** | Tracking of library changes (item_added, item_collected, collection_created, etc.) |
| **MCP integration** | Model Context Protocol for giving AI agents access to your library |
| **Stripe billing** | SaaS subscription model ($8/mo from landing page) |

---

## 3. Data Model (Prisma Schema)

### Core Entities

**`User`**
- Authentication via better-auth (Google OAuth)
- Stripe customer ID for subscriptions
- Extension ingest token for browser extension auth
- Preferences (e.g., `smartCollectionsDisabled` opt-out)

**`LibraryItem`**
- The central entity — saved content from any source
- `source`: Which platform it came from (`chrome_bookmarks`, `x_bookmarks`, `youtube_watch_later`, `tiktok`, `instagram`, `pinterest`, `github_starred_repositories`, `google_photos`, `cache_note`)
- `kind`: `bookmark`, `folder`, or `note`
- `externalId`: The source-native ID
- `sourceAliasIds`: For handling Chrome bookmark ID churn across syncs
- `browserProfileId`: Namespace for browser extension profiles
- `url`, `caption`, `noteContentHtml`, `noteContentState`, `noteContentText`
- `sourceMetadata`: Integration-specific JSON blob
- `reviewedAt`: Null = not yet reviewed; enters review workflow
- Many-to-many with `Collection`

**`Collection`**
- User-created grouping of library items
- Priority: `very_relevant`, `relevant`, `peripheral`, `archive`
- Public sharing via `shareId` + `sharedAt`

**`LibraryActivityEvent`**
- Append-only timeline of library changes
- `kind`: `collection_created`, `collection_shared`, `item_added`, `item_collected`, `item_updated`, `source_connected`
- Rich `metadata` JSON for event-specific payloads

**`Feedback`**
- User-submitted feedback surviving account deletion (for product triage)

---

## 4. Integrations Support

### Implemented Importers

| Source | Type | Features |
|--------|------|----------|
| Chrome Bookmarks | Sync | Multi-profile support via `browserProfileId` |
| X (Twitter) Bookmarks | Import | OAuth-based |
| YouTube Watch Later | Sync | |
| TikTok Saved | Import | |
| Instagram Saved | Import | |
| Pinterest Saves | Import | |
| GitHub Starred Repos | Import | |
| Google Photos | Import/OAuth | |
| Cache Notes | First-party | Lexical editor |

### Browser Extension

- Authenticated via `extensionIngestToken` (not session cookies)
- Enables quick saving directly from Chrome

---

## 5. Intelligent Features

### `lib/collections/intelligence/`

From the service names:
- **summary**: AI-generated summaries of content
- **protection**: Asset protection / backup logic
- **schedule**: Scheduled intelligence tasks
- There appears to be a "smart collections" feature that auto-sorts content into collections based on relevance

---

## 6. Architecture Overview

### Tech Stack

- **Runtime**: Node.js 24.x, Bun
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Base-UI, Tailwind CSS 4, Lucide icons
- **Database**: PostgreSQL via Prisma ORM v7
- **Auth**: better-auth with Google OAuth
- **Payments**: Stripe + @better-auth/stripe plugin
- **Rich text**: Lexical editor
- **Search**: nuqs (URL search states), full-text + OCR
- **i18n**: gt-next (locale handling)

### Service Pattern

Following the "Procedure module pattern" from AGENTS.md:
- `lib/{module}/actions.ts` — thin Next.js Server Action adapters (input validation, auth checks, revalidation)
- `lib/{module}/service.ts` — pure business logic, framework-agnostic
- Never import actions from services; services are testable in isolation

### Module Organization

```
lib/
├── auth/           # Authentication service + server actions
├── billing/       # Stripe subscriptions, prices, status
├── collections/   # Collection CRUD, intelligence, sharing, utils
├── common/         # Shared utilities (logging, errors, strings, etc.)
├── feedback/       # User feedback service + actions
├── integrations/  # All importer services, chrome, github, youtube, etc.
├── i18n/          # Locale/public strings
├── review/        # Review workflow service + actions
├── activity/      # Activity timeline service
└── dayjs/         # Date utilities + locales
```

---

## 7. Open Questions (for the author)

To ensure the repo intent is crystal clear, I'd love your answers to:

### Q1: The Review Workflow
What exactly is the "review" workflow (`reviewedAt` field, `lib/review/`)? Is it:
- A content triage flow where items sit in a "to review" state until the user approves them?
- Something like "mark as read" / "process this item"?
- A moderation queue?

### Q2: Smart Collections
How do "Smart Collections" work? The schema has `smartCollectionsDisabled` on User. Is this:
- AI clustering that auto-sorts items into collections?
- Suggested collections based on content analysis?
- Manual "priority" sorting (very_relevant → peripheral → archive)?

### Q3: "Intelligence" Services
`lib/collections/intelligence/` contains:
- `summary.ts` — AI summaries
- `protection.ts` — ?
- `schedule.ts` — scheduled tasks

What's "protection" and what's the schedule for?

### Q4: MCP Use Case
The MCP integration (`app/mcp/`, `lib/integrations/mcp/`) — what's the primary use case?
- Personal AI assistant that can query your library?
- Automation workflows triggered by agents?
- Something else?

### Q5: Pricing Model
The landing page shows $8/mo. Is this:
- Unlimited storage?
- Tiered (free vs. paid)?
- Per-feature (e.g., AI features cost extra)?

### Q6: Public Collections
The sharing feature — is the intent:
- Personal portfolio/public link sharing?
- Collaborative sharing?
- Something else?

---

## 8. What I've Assumed (That Could Be Wrong)

| Assumption | Why It Might Be Wrong |
|------------|----------------------|
| "Smart Collections" = AI clustering | The flag is opt-out, suggesting it's on by default, but could be simpler |
| Review = triage | The terminology suggests "enter the review workflow" but could mean something else |
| $8/mo = single tier | Could be "pro" vs. "free" with different limits |
| MCP = personal agent | MCP could be for specific integrations (e.g., Notion export) |

---

*Would you like me to pop this open in your editor, or answer the questions above so I can refine the document?*