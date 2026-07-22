<p align="center">
  <a href="https://www.cachd.app" target="_blank" rel="noopener noreferrer">
    <img src="app/opengraph-image.png" alt="Cache App Preview" width="800"/>
  </a>
</p>

<p align="center">Unify your bookmarks across every platform into a single, searchable, actionable library</p>

<p align="center">
  <a href="https://www.cachd.app" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/cachd.app-000000?logo=vercel&logoColor=white" alt="cachd.app"></a>
  <a href="https://docs.cachd.app" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Docs-33c482.svg" alt="Documentation"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://github.com/rortan134/cache-app/releases"><img src="https://img.shields.io/github/v/release/rortan134/cache-app" alt="Release"></a>
  <a href="./CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg" alt="Code of Conduct"></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="https://twitter.com/gsmmtt" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/twitter/follow/gsmmtt" alt="Twitter Follow"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#why">Why</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#cache-mcp">MCP</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Why Cache

Bookmarking is broken. When you hit "save" on a tweet, a video, or a post, you are making a deliberate decision that *this is worth remembering*. But that intent is immediately lost. It vanishes into a list you never revisit, scattered across a dozen platforms with no connection to your actual workflow or goals. The feeds are designed to keep you scrolling, not to help you resurface what you need. Existing tools treat the "save" action as an afterthought, a dead end rather than a starting point.

Cache exists because that signal is too valuable to waste. It treats the act of saving as a first-class event and builds the entire experience around turning that intent into action. It does not replace your platforms; it respects the intent behind why you use them and gives it a destination.

---

## What Cache does for you

- **Unify your bookmarks** — Integrate Cache into your day-to-day with first-class support for bookmarks from Browser bookmarks, Instagram Saved, TikTok Favorites, YouTube Watch Later, X/Twitter bookmarks, GitHub Stars, Pinterest, Google Photos, MCP, and more, all in one place. Unlike other tools that cap saves, Cache has no limits.
- **Smart collections** — Automatically organizes entries into your collections with AI-assisted relevance ranking. Cache even learns your preferences over time.
- **Overviews** — See a 1-line summary above every collection. As new entries are added, it updates instantly. And if you want to see more detail, just hit expand.
- **AI-assisted search** — Ask the Cache AI agent and search across all your saved content.
- **Automations** — Create custom agents to do anything. Generate daily digests, summaries, and much more.
- **Note-taking** — First-party note-taking support alongside bookmarks.
- **Collaboration** — Share a live view of any collection with anyone, even if they don't use Cache.
- **Remind me (Soon)** — Set up reminders when saving or browsing on items to come back to later.
- **Browser extension** — Capture and sync saved content from anywhere on the web.
- **Export & integrate** — Pipe results into other tools you already use.
- **Simple and low maintenance** — Cache is designed to be simple, low-maintenance, and always portable.

---

## Quickstart

### Cloud-hosted: [www.cachd.app](https://www.cachd.app)

<a href="https://www.cachd.app" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Open-cachd.app-3B3B3B?labelColor=1A1A1A" alt="Open cachd.app"></a>

### Self-hosting (Work-in-progress)

You can self-host Cache for total control over your data and design. Cache has zero telemetry by default.

### Prerequisites

- [Bun](https://bun.sh/) v1.3.14+
- [Node.js](https://nodejs.org/) 24.x
- PostgreSQL 12+ (local or remote)
- A Google Gemini API key (for AI features)

### Local Development

```bash
# Clone the repository
git clone https://github.com/rortan134/cache-app.git
cd cache

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Set up the database
bun run db-deploy

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech Stack

| Category                  | Technology                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Framework**             | [Next.js](https://nextjs.org/) (App Router)                                                                            |
| **UI**                    | [React](https://react.dev/), [Base UI](https://base-ui.com/), [Tailwind CSS](https://tailwindcss.com/)                 |
| **Rich Text**             | [Lexical](https://lexical.dev/), [Streamdown](https://github.com/vercel/streamdown)                                    |
| **Database**              | PostgreSQL, Redis                                                                                                      |
| **Auth**                  | [Better Auth](https://better-auth.com/)                                                                                |
| **Validation**            | [Zod](https://zod.dev/), [@t3-oss/env-nextjs](https://env.t3.gg/)                                                      |
| **AI/LLM**                | [Vercel AI SDK](https://sdk.vercel.ai/), [Google Gemini](https://ai.google.dev/), [@workflow/ai](https://workflow.ai/) |
| **Agentic Web Search**    | [Tavily](https://tavily.com/)                                                                                          |
| **Data Fetching**         | [SWR](https://swr.vercel.app/), [nuqs](https://nuqs.vercel.app/)                                                       |
| **i18n**                  | [gt-next](https://generaltranslation.com)                                                                              |
| **Payments**              | [Stripe](https://stripe.com/)                                                                                          |
| **Workflows**             | [workflow](https://workflow.ai/)                                                                                       |
| **MCP**                   | [MCP SDK](https://modelcontextprotocol.io/)                                                                            |
| **Security (Cloud-only)** | [Arcjet](https://arcjet.com/) (WAF, rate limiting, PII redaction)                                                      |
| **Linting**               | [Ultracite](https://ultracite.dev/) (Biome)                                                                            |
| **React Compiler**        | [babel-plugin-react-compiler](https://react.dev/learn/react-compiler)                                                  |
| **Date Handling**         | [Day.js](https://day.js.org/), [chrono-node](https://github.com/wanasit/chrono)                                        |

---

## Cache MCP

Cache exposes an [MCP](https://modelcontextprotocol.io/) server so AI agents like Claude, Cursor, and others can read and write your library directly — search bookmarks, save new items, list collections, and more.

Endpoint: `https://www.cachd.app/mcp`

- [llms.txt](https://www.cachd.app/llms.txt) — agent context and tool reference
- Generate a setup prompt with your Bearer token from the app (Integrations → MCP)

---

## Roadmap

- **Comments** — Add and view threaded comments on entries.
- **Inbox view** — Triage view for reviewing entries.
- **Notes improvements** — Richer editing experience, advanced formatting.
- **Raycast integration** — Capture and search Cache from Raycast.
- **Substack integration** — Import and save Substack posts and newsletters.

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

Open an [issue](https://github.com/rortan134/cache-app/issues?q=sort%3Aupdated-desc+is%3Aissue+state%3Aopen+) if you believe you've encountered a bug.

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md) code of conduct.

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE file](LICENSE) for details.
