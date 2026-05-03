export interface ChangelogEntry {
    button?: {
        url: string;
        text: string;
    };
    date: string;
    description: string;
    image?: string;
    items?: string[];
    title: string;
    version: string;
}

export const changelogEntries = [
    {
        button: {
            text: "Open Integrations",
            url: "/library",
        },
        date: "3 May 2026",
        description:
            "Your library is now accessible to AI agents via the Model Context Protocol. Connect Claude Desktop, Cursor, or any MCP-compatible client to search, read, and manage your bookmarks programmatically.",
        items: [
            "New MCP integration tile in the Integrations panel",
            "One-click copy of a setup prompt with a signed Bearer token",
            "list_library_items — search and browse bookmarks and notes",
            "get_library_item — read any item by ID",
            "add_library_item — save a new bookmark or note",
            "delete_library_item — remove an item from your library",
            "list_collections — view collections with item counts",
            "Stateless HMAC-signed tokens for secure agent authentication",
        ],
        title: "Agent access via MCP",
        version: "Version 1.1.0",
    },
    {
        button: {
            text: "Explore Cache",
            url: "/",
        },
        date: "9 April 2026",
        description:
            "Cache is officially live. This first release delivers the core experience for saving, organizing, and searching your personal knowledge library.",
        image: "/opengraph-image.png",
        items: [
            "Unified bookmark import and management across multiple sources",
            "Fast library browsing with collection-based organization",
            "Actionable search to quickly find saved content",
            "Foundational sharing and workspace-ready collaboration flows",
        ],
        title: "Product launch",
        version: "Version 1.0.0",
    },
] satisfies ChangelogEntry[];
