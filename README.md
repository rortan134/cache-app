<p align="center">
  <a href="https://www.cachd.app" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="public/cache-logo-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="public/cache-logo-light.svg">
      <img src="public/cache-logo-light.svg" alt="Cache Logo" width="320"/>
    </picture>
  </a>
</p>

<p align="center">Unify your bookmarks across every platform into a single, searchable, actionable library.</p>

<p align="center">
  <a href="https://www.cachd.app" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/cachd.app-000000?logo=vercel&logoColor=white" alt="cachd.app"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://github.com/rortan134/cache-app/releases"><img src="https://img.shields.io/github/v/release/rortan134/cache-app" alt="Release"></a>
  <a href="https://github.com/rortan134/cache-app/actions"><img src="https://img.shields.io/github/actions/workflow/status/rortan134/cache-app/ci.yml?branch=main" alt="CI"></a>
  <a href="./CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg" alt="Code of Conduct"></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **Unified Library** — First-class support for bookmarks from Instagram Saved, TikTok Favorites, YouTube Watch Later, X/Twitter Bookmarks, GitHub Stars, Chrome bookmarks, Pinterest, Google Photos, and more, all in one place.
- **Plain English Search** — Natural-language search across all your saved content.
- **One-Step Collections** — Organize results into collections with AI-assisted relevance ranking.
- **AI-Powered Synthesis** — Automations generate daily, weekly, and monthly digests. Smart collections surface what matters.
- **Rich Notes** — First-party WYSIWYG notes (Lexical editor) alongside bookmarks.
- **Browser Extension** — Manifest V3 Chrome extension that scrapes saved content from social platforms.
- **Export & Integrate** — Pipe results into Notion and other tools.

---

## Quickstart

### Cloud-hosted: [www.cachd.app](https://www.cachd.app)

<a href="https://www.cachd.app" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/cachd.app-000000?logo=vercel&logoColor=white" alt="cachd.app"></a>

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

| Category           | Technology                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Framework**      | [Next.js](https://nextjs.org/) 16 (App Router)                                                                             |
| **Runtime**        | [Bun](https://bun.sh/) 1.3, [Node.js](https://nodejs.org/) 24.x                                                            |
| **UI**             | [React](https://react.dev/) 19, [Base UI](https://base-ui.com/) 1.5, [Tailwind CSS](https://tailwindcss.com/) 4            |
| **Icons**          | [lucide-react](https://lucide.dev/) 1.17                                                                                   |
| **Rich Text**      | [Lexical](https://lexical.dev/) 0.45, [Streamdown](https://github.com/vercel/streamdown) 2.5                               |
| **Database**       | PostgreSQL via [Prisma](https://www.prisma.io/) 7, Redis                                                                   |
| **Auth**           | [Better Auth](https://better-auth.com/) 1.6 (Google, GitHub, X, Pinterest OAuth)                                           |
| **Validation**     | [Zod](https://zod.dev/) 4, [@t3-oss/env-nextjs](https://env.t3.gg/)                                                        |
| **AI/LLM**         | [Vercel AI SDK](https://sdk.vercel.ai/) 6, [Google Gemini](https://ai.google.dev/), [@workflow/ai](https://workflow.ai/) 5 |
| **Web Search**     | [Tavily](https://tavily.com/)                                                                                              |
| **RPC / API**      | [oRPC](https://orpc.unnoq.com/) 1.14 (server, client, React)                                                               |
| **Data Fetching**  | [SWR](https://swr.vercel.app/) 2.4, [nuqs](https://nuqs.vercel.app/) 2.8                                                   |
| **i18n**           | gt-next (en-US, fr-FR, es-ES, pt-BR)                                                                                       |
| **Payments**       | [Stripe](https://stripe.com/) 22                                                                                           |
| **Workflows**      | [workflow](https://workflow.ai/) 4.3, [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)                                |
| **MCP**            | [MCP SDK](https://modelcontextprotocol.io/) 1.29                                                                           |
| **Security**       | [Arcjet](https://arcjet.com/) 1.4 (WAF, rate limiting, PII redaction, prompt injection detection)                          |
| **Observability**  | [OpenTelemetry](https://opentelemetry.io/), [Vercel Analytics](https://vercel.com/docs/analytics)                          |
| **Linting**        | [Ultracite](https://ultracite.dev/) 7 (Biome)                                                                              |
| **React Compiler** | [babel-plugin-react-compiler](https://react.dev/learn/react-compiler) (auto-memoization)                                   |
| **Date Handling**  | [Day.js](https://day.js.org/) 1.11, [chrono-node](https://github.com/wanasit/chrono) 2.9                                   |
| **Testing**        | [Bun test](https://bun.sh/docs/cli/test)                                                                                   |
| **Deployment**     | [Vercel](https://vercel.com/)                                                                                              |

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md) code of conduct.

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE file](LICENSE) for details.
