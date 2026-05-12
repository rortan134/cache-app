const llmsFullContent = `# Cache
> Unify your bookmarks across all platforms into a single, searchable, actionable library. Save, organize, review, and synthesize content you care about.

## Core features

- **Universal import** — Sync bookmarks from Chrome, Instagram, TikTok, YouTube, X/Twitter, GitHub stars, Pinterest, and Google Photos
- **Collections** — Organize items into named collections with priority levels (Very Relevant, Relevant, Peripheral, Archive)
- **Smart collections** — AI-powered automatic tagging of new items into collections
- **AI summaries** — Generate summaries of collections and sections using Google Gemini
- **Full-text search** — Search across captions, URLs, and note text
- **Public sharing** — Share collections publicly via a unique link
- **Review workflow** — Mark items as reviewed for weekly triage (Pro feature)
- **Notes** — Save free-form notes alongside bookmarks
- **Browser extension** — Chrome extension for one-click saving
- **PWA** — Install as a progressive web app with offline support
- **Multi-language** — en-US, fr-FR, es-ES, pt-BR

## MCP integration (agent access)

Cache exposes a Model Context Protocol (MCP) server so AI agents can read and write your library directly.

### Setup

1. Visit \`https://cachd.app/mcp/prompt\` (POST) while authenticated to get a personalized setup prompt with your Bearer token, or generate one programmatically.
2. Configure your MCP client:

**Claude Desktop** (\`claude_desktop_config.json\`):
\`\`\`json
{
  "mcpServers": {
    "cache": {
      "url": "https://cachd.app/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
\`\`\`

**Cursor / other clients**: Use the endpoint \`https://cachd.app/mcp\` with the Bearer token.

### Available tools

| Tool | Description | Parameters |
|------|-------------|------------|
| \`list_library_items\` | Search and browse saved bookmarks/notes | \`collectionId?\`, \`limit?\` (1-50), \`search?\` |
| \`get_library_item\` | Read a specific item by ID | \`itemId\` (required) |
| \`add_library_item\` | Save a new bookmark or note | \`url\` (required for bookmarks), \`caption?\`, \`noteContentText?\` |
| \`delete_library_item\` | Remove an item | \`itemId\` (required) |
| \`list_collections\` | List all collections with item counts | _(none)_ |

## Data model

- **LibraryItem** — A saved bookmark, folder, or note. Has a \`kind\` (bookmark, folder, note) and \`source\` (cache_note, chrome_bookmarks, github_starred_repositories, instagram, pinterest, tiktok, x_bookmarks, youtube_watch_later, etc.). Can belong to multiple collections.
- **Collection** — A named group of library items with optional description, priority, and public sharing.
- **User** — Account with OAuth (Google) or email/password authentication.

## Key constants

- Free tier previews up to 12 items per collection
- Review window: 7 days per item
- Max 50 items per MCP list query
- Max 100 collections per item

## Pricing

- **Free**: Unlimited bookmarks, collections, AI summaries, 7-day review workflow
- **Pro**: Unlimited review, higher AI quota, priority support — monthly or yearly via Stripe
`;

export const GET = () =>
    new Response(llmsFullContent, {
        headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "Content-Type": "text/markdown; charset=utf-8",
        },
    });
