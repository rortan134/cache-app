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
