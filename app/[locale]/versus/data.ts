export type VersusCategoryId =
    | "ai-hubs"
    | "read-it-later"
    | "bookmark-managers"
    | "visual-boards"
    | "pkm";

export interface VersusCategory {
    cachePositioning: string;
    comparisonRows: ReadonlyArray<{
        label: string;
        cacheValue: string;
        competitorValue: string;
    }>;
    competitorPositioning: string;
    description: string;
    heroSummary: string;
    id: VersusCategoryId;
    label: string;
    reasons: ReadonlyArray<{
        title: string;
        description: string;
    }>;
    shortLabel: string;
}

export interface VersusEntry {
    alternativeLabel: string;
    bestFor: string;
    categoryId: VersusCategoryId;
    domain: string;
    focus: string;
    name: string;
    slug: string;
    tagline: string;
    website: string;
}

export const versusCategories = [
    {
        cachePositioning:
            "Unified saved-content library across mainstream platforms, with natural-language search, one-step collections, and export-friendly organization.",
        comparisonRows: [
            {
                cacheValue:
                    "Build a searchable personal library from everything you save across platforms.",
                competitorValue:
                    "Capture and auto-organize links, images, notes, or files with AI assistance.",
                label: "Primary use case",
            },
            {
                cacheValue:
                    "Natural-language search plus actionable collections and synthesis.",
                competitorValue:
                    "Semantic lookup, smart tagging, or AI-assisted retrieval.",
                label: "Rediscovery style",
            },
            {
                cacheValue:
                    "A working library designed for retrieval, grouping, and downstream use.",
                competitorValue:
                    "AI categorization with each product's own filing model.",
                label: "Organization model",
            },
            {
                cacheValue:
                    "A single place to capture, search, organize, and move saved knowledge into workflows.",
                competitorValue:
                    "An AI-native capture tool focused on fast saving and lightweight recall.",
                label: "Best if you want",
            },
        ],
        competitorPositioning:
            "AI-first capture and organization with different tradeoffs around collaboration, platform coverage, or library structure.",
        description:
            "Tools focused on saving anything quickly, then using AI, OCR, or semantic search to help people find it later.",
        heroSummary:
            "Cache is strongest when you want one working library for everything you save, not just a prettier inbox of links.",
        id: "ai-hubs",
        label: "AI-powered bookmark managers",
        reasons: [
            {
                description:
                    "Cache is designed around the moment saved content needs to become useful again, not just around making capture effortless.",
                title: "Broader retrieval workflow",
            },
            {
                description:
                    "Collections, synthesis, and export paths make it easier to turn messy saves into working knowledge.",
                title: "One-step organization",
            },
            {
                description:
                    "Cache is built around unifying fragmented saves from mainstream platforms instead of optimizing for a single native ecosystem.",
                title: "Cross-platform intent",
            },
        ],
        shortLabel: "AI hubs",
    },
    {
        cachePositioning:
            "A persistent knowledge library for saved content across formats, not just a reading inbox.",
        comparisonRows: [
            {
                cacheValue:
                    "Unify saved links, media, and platform bookmarks into one searchable library.",
                competitorValue:
                    "Save articles, newsletters, feeds, or videos to consume later.",
                label: "Primary use case",
            },
            {
                cacheValue:
                    "Search and group content by intent, project, or question.",
                competitorValue:
                    "Return to a queue, reading list, or highlight archive.",
                label: "Rediscovery style",
            },
            {
                cacheValue:
                    "Collections and library workflows built around retrieval.",
                competitorValue:
                    "Reading inboxes, tags, highlights, and consumption tools.",
                label: "Organization model",
            },
            {
                cacheValue:
                    "A long-term system for everything you save online.",
                competitorValue:
                    "A dedicated place to read, highlight, or listen later.",
                label: "Best if you want",
            },
        ],
        competitorPositioning:
            "Reading-first products optimized for later consumption and highlighting.",
        description:
            "Products centered on distraction-free reading, article parsing, highlighting, newsletters, RSS, and watch/read queues.",
        heroSummary:
            "Cache wins when your problem is not simply reading later, but remembering, organizing, and reusing what you already saved.",
        id: "read-it-later",
        label: "Read-it-later apps",
        reasons: [
            {
                description:
                    "Cache treats saved content as a reusable library, not only as a pile of unread items.",
                title: "Beyond the reading queue",
            },
            {
                description:
                    "It works for the reality where useful saves live across social apps, browsers, videos, and articles.",
                title: "Designed for fragmented saving",
            },
            {
                description:
                    "Collections and synthesis make it easier to pull saved ideas into projects, research, or notes.",
                title: "Closer to action",
            },
        ],
        shortLabel: "Read later",
    },
    {
        cachePositioning:
            "A modern bookmark library that starts from fragmented saves and focuses on searchability and usefulness.",
        comparisonRows: [
            {
                cacheValue:
                    "Bring together saved content from many platforms into one retrieval layer.",
                competitorValue:
                    "Store, tag, archive, and maintain classic web bookmarks.",
                label: "Primary use case",
            },
            {
                cacheValue:
                    "Plain-English search and project-oriented collections.",
                competitorValue:
                    "Folders, tags, filters, and link-centric search.",
                label: "Rediscovery style",
            },
            {
                cacheValue:
                    "Library-first and oriented around modern saved-content behavior.",
                competitorValue:
                    "Bookmark-first and oriented around manual filing depth.",
                label: "Organization model",
            },
            {
                cacheValue:
                    "A modern alternative to scattered saves and browser silos.",
                competitorValue:
                    "Maximum control over classic bookmarking structures.",
                label: "Best if you want",
            },
        ],
        competitorPositioning:
            "Rigorous link management with established folder, tag, or archival systems.",
        description:
            "Bookmark tools focused on folders, tags, archiving, broken-link protection, and reliable long-term organization.",
        heroSummary:
            "Cache is the better fit when traditional bookmarking feels too static for the amount and variety of content you save today.",
        id: "bookmark-managers",
        label: "Traditional bookmark managers",
        reasons: [
            {
                description:
                    "Cache is about everything you save, including the context around why it mattered in the first place.",
                title: "Built for more than URLs",
            },
            {
                description:
                    "You can organize through search and collections instead of relying solely on meticulous folder hygiene.",
                title: "Less maintenance-heavy",
            },
            {
                description:
                    "Cache is designed for rediscovery and action, not only for storage discipline.",
                title: "Stronger product narrative",
            },
        ],
        shortLabel: "Bookmark managers",
    },
    {
        cachePositioning:
            "A searchable saved-content system that still supports organization without turning every workflow into a board.",
        comparisonRows: [
            {
                cacheValue:
                    "Search, organize, and reuse saved content across platforms.",
                competitorValue:
                    "Curate inspiration visually in boards, channels, or shared spaces.",
                label: "Primary use case",
            },
            {
                cacheValue: "Query-driven retrieval and thematic collections.",
                competitorValue: "Spatial browsing and visual grouping.",
                label: "Rediscovery style",
            },
            {
                cacheValue:
                    "Library-first with emphasis on utility and recall.",
                competitorValue:
                    "Board-first with emphasis on presentation and moodboarding.",
                label: "Organization model",
            },
            {
                cacheValue:
                    "A private system for saved content that stays useful over time.",
                competitorValue:
                    "A visual workspace for inspiration and curation.",
                label: "Best if you want",
            },
        ],
        competitorPositioning:
            "Visual-first curation and spatial arrangement for inspiration or project planning.",
        description:
            "Products used to collect inspiration, references, links, and project materials in a visual or spatial format.",
        heroSummary:
            "Cache is stronger when the hard part is finding and reusing inspiration later, not just pinning it beautifully today.",
        id: "visual-boards",
        label: "Visual curation tools",
        reasons: [
            {
                description:
                    "Once inspiration piles up, Cache helps you find the right item again without scanning every board.",
                title: "Search matters more at scale",
            },
            {
                description:
                    "Cache handles links, knowledge, and saved references that do not naturally belong on a moodboard.",
                title: "Works outside visual workflows",
            },
            {
                description:
                    "It is designed for the moment you need an idea back in context, not only for collecting references.",
                title: "Better for everyday retrieval",
            },
        ],
        shortLabel: "Visual boards",
    },
    {
        cachePositioning:
            "Purpose-built for capturing, unifying, and resurfacing saves before they get pushed into broader note systems.",
        comparisonRows: [
            {
                cacheValue:
                    "Dedicated saved-content retrieval and organization.",
                competitorValue:
                    "General-purpose notes, databases, or knowledge graphs.",
                label: "Primary use case",
            },
            {
                cacheValue:
                    "Search and collections centered on saved media and links.",
                competitorValue:
                    "Queries, notes, databases, or graph relationships.",
                label: "Rediscovery style",
            },
            {
                cacheValue: "Opinionated around capture and later usefulness.",
                competitorValue:
                    "Highly flexible but often user-defined and system-heavy.",
                label: "Organization model",
            },
            {
                cacheValue:
                    "A dedicated layer between saving something and operationalizing it.",
                competitorValue:
                    "A broader workspace for projects, notes, and structured knowledge.",
                label: "Best if you want",
            },
        ],
        competitorPositioning:
            "Flexible note or knowledge platforms that can be adapted into a saved-content workflow.",
        description:
            "General-purpose knowledge systems that people often use as a catch-all destination for clipped articles, links, and notes.",
        heroSummary:
            "Cache is the better first stop when bookmarking is becoming knowledge work, but you do not want to build a whole system just to save a link.",
        id: "pkm",
        label: "PKM and second-brain tools",
        reasons: [
            {
                description:
                    "Cache gives you a purpose-built saved-content workflow instead of asking you to architect one inside a general note tool.",
                title: "Less setup burden",
            },
            {
                description:
                    "It starts at the save moment, which makes it easier to build a useful library without constant manual system design.",
                title: "Capture-first by default",
            },
            {
                description:
                    "Cache fits well as the retrieval layer before content gets moved into your broader PKM stack.",
                title: "Better handoff into notes",
            },
        ],
        shortLabel: "PKM",
    },
] as const satisfies readonly VersusCategory[];

const categoryById = versusCategories.reduce<
    Partial<Record<VersusCategoryId, VersusCategory>>
>((accumulator, category) => {
    accumulator[category.id] = category;
    return accumulator;
}, {});

export const versusEntries = [
    {
        alternativeLabel: "Perhaps the closest direct AI-native alternative.",
        bestFor:
            "people who want a minimalist, folderless AI bookmarking experience",
        categoryId: "ai-hubs",
        domain: "mymind.com",
        focus: "automatic organization of images, quotes, articles, and links",
        name: "mymind",
        slug: "mymind",
        tagline: "AI-organized visual and idea bookmark manager.",
        website: "https://mymind.com",
    },
    {
        alternativeLabel: "A collaborative AI-native workspace alternative.",
        bestFor:
            "teams or users who want collaboration and semantic workspace search",
        categoryId: "ai-hubs",
        domain: "fabric.so",
        focus: "saving links, documents, and notes into a collaborative AI workspace",
        name: "Fabric",
        slug: "fabric",
        tagline: "Collaborative AI-native workspace and filing cabinet.",
        website: "https://fabric.so",
    },
    {
        alternativeLabel:
            "A feature-rich bookmarking and read-later alternative.",
        bestFor: "users who want a dense, feature-rich bookmarking workflow",
        categoryId: "ai-hubs",
        domain: "cubox.pro",
        focus: "smart folders, AI parsing, text extraction, and deep search",
        name: "Cubox",
        slug: "cubox",
        tagline: "Power-user bookmarking and read-later hybrid.",
        website: "https://cubox.pro",
    },
    {
        alternativeLabel: "A more visual AI-assisted inspiration library.",
        bestFor:
            "people collecting inspiration and references with a visual bias",
        categoryId: "ai-hubs",
        domain: "cosmos.so",
        focus: "saving visual inspiration, links, and text without social feed noise",
        name: "Cosmos",
        slug: "cosmos",
        tagline:
            "Visual inspiration saver positioned as a Pinterest alternative.",
        website: "https://cosmos.so",
    },
    {
        alternativeLabel: "An AI capture-and-synthesis alternative.",
        bestFor: "users who want AI help on top of captured information",
        categoryId: "ai-hubs",
        domain: "saner.ai",
        focus: "capturing web information, retrieving it naturally, and synthesizing it with AI",
        name: "Saner.ai",
        slug: "saner-ai",
        tagline: "AI capture, search, and synthesis workspace.",
        website: "https://saner.ai",
    },
    {
        alternativeLabel: "A polished Apple-first save-anything alternative.",
        bestFor:
            "users deep in the Apple ecosystem who want native-feeling capture",
        categoryId: "ai-hubs",
        domain: "anybox.app",
        focus: "collecting links, images, text snippets, and files with Apple-first integration",
        name: "Anybox",
        slug: "anybox",
        tagline: "Save-everything manager with Apple ecosystem polish.",
        website: "https://anybox.app",
    },
    {
        alternativeLabel:
            "A reading-first alternative with strong highlight workflows.",
        bestFor: "heavy readers who want highlighting and export workflows",
        categoryId: "read-it-later",
        domain: "readwise.io",
        focus: "articles, RSS, newsletters, YouTube transcripts, and highlights",
        name: "Readwise Reader",
        slug: "readwise-reader",
        tagline: "Reading and highlighting powerhouse for saved content.",
        website: "https://readwise.io",
    },
    {
        alternativeLabel: "A design-forward read-it-later alternative.",
        bestFor: "users who mostly save things to read or listen to later",
        categoryId: "read-it-later",
        domain: "getmatter.com",
        focus: "text extraction, text-to-speech, highlighting, and curated reading",
        name: "Matter",
        slug: "matter",
        tagline: "Beautiful read-it-later app for articles and newsletters.",
        website: "https://getmatter.com",
    },
    {
        alternativeLabel: "The legacy save-it-for-later alternative.",
        bestFor: "people who want a familiar, lightweight reading queue",
        categoryId: "read-it-later",
        domain: "getpocket.com",
        focus: "simple article saving for later reading",
        name: "Pocket",
        slug: "pocket",
        tagline: "Classic save-for-later article queue.",
        website: "https://getpocket.com",
    },
    {
        alternativeLabel: "A minimalist article-reading alternative.",
        bestFor: "people who want a stripped-back read-it-later workflow",
        categoryId: "read-it-later",
        domain: "instapaper.com",
        focus: "clean saved-article reading without much library complexity",
        name: "Instapaper",
        slug: "instapaper",
        tagline: "Minimalist article reading app.",
        website: "https://instapaper.com",
    },
    {
        alternativeLabel: "An open-source read-it-later alternative.",
        bestFor: "users who care about openness and read-later workflows",
        categoryId: "read-it-later",
        domain: "omnivore.app",
        focus: "open-source saving and highlighting for reading workflows",
        name: "Omnivore",
        slug: "omnivore",
        tagline:
            "Open-source reading inbox for articles, newsletters, and RSS.",
        website: "https://omnivore.app",
    },
    {
        alternativeLabel: "A self-hostable read-it-later alternative.",
        bestFor: "users who want a self-hosted Pocket-style setup",
        categoryId: "read-it-later",
        domain: "wallabag.org",
        focus: "self-hosted saving and reading for articles",
        name: "Wallabag",
        slug: "wallabag",
        tagline: "Self-hostable read-it-later service.",
        website: "https://wallabag.org",
    },
    {
        alternativeLabel: "A leading traditional bookmark manager alternative.",
        bestFor:
            "people who want the strongest traditional bookmarking toolkit",
        categoryId: "bookmark-managers",
        domain: "raindrop.io",
        focus: "rigorous bookmark organization with full-text search and backup",
        name: "Raindrop.io",
        slug: "raindrop",
        tagline: "Modern bookmark manager with folders, tags, and backups.",
        website: "https://raindrop.io",
    },
    {
        alternativeLabel:
            "A text-first bookmarking alternative for power users.",
        bestFor: "power users who prefer minimalism and manual control",
        categoryId: "bookmark-managers",
        domain: "pinboard.in",
        focus: "speed, reliability, and simple text-first bookmarking",
        name: "Pinboard",
        slug: "pinboard",
        tagline: "Fast, no-nonsense bookmark manager for power users.",
        website: "https://pinboard.in",
    },
    {
        alternativeLabel: "A developer-centric bookmarking alternative.",
        bestFor: "developers organizing technical knowledge and resources",
        categoryId: "bookmark-managers",
        domain: "bookmarks.dev",
        focus: "saving developer resources, snippets, and technical references",
        name: "Bookmarks.dev",
        slug: "bookmarks-dev",
        tagline: "Bookmark manager built for developers and tech teams.",
        website: "https://bookmarks.dev",
    },
    {
        alternativeLabel:
            "A bookmarking alternative with web annotation tooling.",
        bestFor: "users who want direct annotation inside saved web pages",
        categoryId: "bookmark-managers",
        domain: "diigo.com",
        focus: "bookmarking, page highlighting, and sticky-note annotations",
        name: "Diigo",
        slug: "diigo",
        tagline: "Legacy bookmark manager with annotation tools.",
        website: "https://diigo.com",
    },
    {
        alternativeLabel: "A tab-workspace alternative.",
        bestFor:
            "people who think in tab sets more than in long-term libraries",
        categoryId: "bookmark-managers",
        domain: "gettoby.com",
        focus: "saving groups of tabs as workspaces",
        name: "Toby",
        slug: "toby",
        tagline: "Workspace-oriented tab and session organizer.",
        website: "https://gettoby.com",
    },
    {
        alternativeLabel: "A browser-workspace alternative.",
        bestFor: "people optimizing active browser sessions and workspaces",
        categoryId: "bookmark-managers",
        domain: "workona.com",
        focus: "workspace-based tab management and work context switching",
        name: "Workona",
        slug: "workona",
        tagline: "Browser workspaces and tab organization platform.",
        website: "https://workona.com",
    },
    {
        alternativeLabel: "A privacy-focused Apple bookmarking alternative.",
        bestFor: "Apple users who want premium local-feeling bookmarking",
        categoryId: "bookmark-managers",
        domain: "goodlinks.app",
        focus: "privacy-focused bookmarking and reading on iOS and macOS",
        name: "GoodLinks",
        slug: "goodlinks",
        tagline: "Premium privacy-minded bookmarking for Apple devices.",
        website: "https://goodlinks.app",
    },
    {
        alternativeLabel: "A visual curation and channel-based alternative.",
        bestFor:
            "creative thinkers building reference trails and public curation",
        categoryId: "visual-boards",
        domain: "are.na",
        focus: "collecting links, images, and PDFs into associative visual channels",
        name: "Are.na",
        slug: "arena",
        tagline: "Visual curation platform built around channels.",
        website: "https://are.na",
    },
    {
        alternativeLabel: "The mainstream visual bookmarking alternative.",
        bestFor: "people primarily collecting visual inspiration",
        categoryId: "visual-boards",
        domain: "pinterest.com",
        focus: "large-scale visual discovery and pinning",
        name: "Pinterest",
        slug: "pinterest",
        tagline: "Mainstream visual bookmarking and inspiration platform.",
        website: "https://pinterest.com",
    },
    {
        alternativeLabel: "A spatial creative-board alternative.",
        bestFor:
            "creative teams planning visually and arranging references spatially",
        categoryId: "visual-boards",
        domain: "milanote.com",
        focus: "drag-and-drop visual project boards with links, images, and notes",
        name: "Milanote",
        slug: "milanote",
        tagline: "Spatial board tool for creative project planning.",
        website: "https://milanote.com",
    },
    {
        alternativeLabel: "A modular visual-board alternative.",
        bestFor: "users who want visual planning with flexible block layouts",
        categoryId: "visual-boards",
        domain: "xtiles.app",
        focus: "organizing content in modular visual boards",
        name: "xTiles",
        slug: "xtiles",
        tagline: "Flexible visual tiles for planning and curation.",
        website: "https://xtiles.app",
    },
    {
        alternativeLabel: "A collection-sharing alternative.",
        bestFor: "people curating and sharing resources with others",
        categoryId: "visual-boards",
        domain: "wakelet.com",
        focus: "saving links, posts, and videos into shareable collections",
        name: "Wakelet",
        slug: "wakelet",
        tagline: "Collection-based curation and sharing platform.",
        website: "https://wakelet.com",
    },
    {
        alternativeLabel: "A broader all-purpose workspace alternative.",
        bestFor:
            "users who want a flexible all-purpose workspace and database layer",
        categoryId: "pkm",
        domain: "notion.so",
        focus: "databases, notes, and web-clipped content in one workspace",
        name: "Notion",
        slug: "notion",
        tagline: "Flexible workspace used by many as a clipping destination.",
        website: "https://notion.so",
    },
    {
        alternativeLabel: "A local-first PKM alternative.",
        bestFor: "people building a local-first personal knowledge graph",
        categoryId: "pkm",
        domain: "obsidian.md",
        focus: "markdown-based notes and second-brain workflows",
        name: "Obsidian",
        slug: "obsidian",
        tagline: "Local-first markdown PKM system.",
        website: "https://obsidian.md",
    },
    {
        alternativeLabel: "An outliner-style PKM alternative.",
        bestFor: "users who think in linked outlines and graphs",
        categoryId: "pkm",
        domain: "logseq.com",
        focus: "outlining, graph relationships, and structured personal knowledge",
        name: "Logseq",
        slug: "logseq",
        tagline: "Outliner-style local-first knowledge graph.",
        website: "https://logseq.com",
    },
    {
        alternativeLabel: "A legacy save-everything alternative.",
        bestFor: "users who want a long-established clipping and note archive",
        categoryId: "pkm",
        domain: "evernote.com",
        focus: "capturing full web pages, notes, PDFs, and OCR-searchable documents",
        name: "Evernote",
        slug: "evernote",
        tagline: "Legacy save-everything notes app with strong clipping roots.",
        website: "https://evernote.com",
    },
    {
        alternativeLabel: "A notebook-style PKM alternative.",
        bestFor: "people who already work inside Microsoft's note ecosystem",
        categoryId: "pkm",
        domain: "onenote.com",
        focus: "organizing clipped content inside notebooks and sections",
        name: "OneNote",
        slug: "onenote",
        tagline: "Notebook-based notes platform from Microsoft.",
        website: "https://onenote.com",
    },
    {
        alternativeLabel: "An object-based PKM alternative.",
        bestFor: "users who want object-based PKM for mixed media",
        categoryId: "pkm",
        domain: "capacities.io",
        focus: "turning links and media into typed objects inside a knowledge graph",
        name: "Capacities",
        slug: "capacities",
        tagline: "Object-oriented note and knowledge system.",
        website: "https://capacities.io",
    },
    {
        alternativeLabel: "A structured knowledge-graph alternative.",
        bestFor: "users who want highly structured personal knowledge systems",
        categoryId: "pkm",
        domain: "tana.inc",
        focus: "structured, object-like knowledge capture and graph workflows",
        name: "Tana",
        slug: "tana",
        tagline: "Structured knowledge graph for advanced workflows.",
        website: "https://tana.inc",
    },
] as const satisfies readonly VersusEntry[];

export const versusEntryCount = versusEntries.length;

export function getVersusCategory(
    categoryId: VersusCategoryId
): VersusCategory {
    const category = categoryById[categoryId];

    if (!category) {
        throw new Error(`Unknown versus category: ${categoryId}`);
    }

    return category;
}

export function getVersusEntry(slug: string): VersusEntry | undefined {
    return versusEntries.find((entry) => entry.slug === slug);
}

export function getEntriesByCategory(
    categoryId: VersusCategoryId
): readonly VersusEntry[] {
    return versusEntries.filter((entry) => entry.categoryId === categoryId);
}
