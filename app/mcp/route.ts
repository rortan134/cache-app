import { createMcpHandler, withMcpAuth } from "mcp-handler";
import * as z from "zod";
import {
    getLibraryItem,
    listCollections,
    listLibraryItems,
} from "@/lib/collections/service";
import { verifyMcpAuthToken } from "@/lib/integrations/mcp/auth";
import {
    addLibraryItem,
    deleteLibraryItemMcp,
} from "@/lib/integrations/mcp/service";

interface McpExtra {
    authInfo?: {
        extra?: {
            userId?: string;
        };
    };
}

const UNAUTHORIZED_RESULT = {
    content: [
        {
            text: "Unauthorized: missing or invalid token.",
            type: "text" as const,
        },
    ],
    isError: true as const,
};

function resolveUserId(extra: McpExtra): string | undefined {
    return extra.authInfo?.extra?.userId;
}

function safeJsonStringify(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

const baseHandler = createMcpHandler((server) => {
    server.registerTool(
        "list_library_items",
        {
            description:
                "List library items for the authenticated user. Supports optional search, collection filtering, and pagination limit.",
            inputSchema: {
                // @ts-expect-error TODO: fix types
                collectionId: z
                    .string()
                    .optional()
                    .describe("Filter results to a specific collection ID"),
                // @ts-expect-error TODO: fix types
                limit: z
                    .number()
                    .min(1)
                    .max(50)
                    .optional()
                    .describe(
                        "Maximum number of items to return (default 20, max 50)"
                    ),
                // @ts-expect-error TODO: fix types
                search: z
                    .string()
                    .optional()
                    .describe(
                        "Search query matched against captions, URLs, and note text"
                    ),
            },
            title: "List Library Items",
        },
        // @ts-expect-error TODO: fix types
        async (args, extra: McpExtra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const items = await listLibraryItems({
                    collectionId: args.collectionId,
                    limit: args.limit,
                    search: args.search,
                    userId,
                });

                return {
                    content: [{ text: safeJsonStringify(items), type: "text" }],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            text:
                                error instanceof Error
                                    ? error.message
                                    : "Could not list library items.",
                            type: "text",
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        "get_library_item",
        {
            description: "Retrieve a single library item by its ID.",
            inputSchema: {
                // @ts-expect-error TODO: fix types
                itemId: z
                    .string()
                    .describe("The unique ID of the library item to retrieve"),
            },
            title: "Get Library Item",
        },
        // @ts-expect-error TODO: fix types
        async (args, extra: McpExtra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const item = await getLibraryItem({
                    itemId: args.itemId,
                    userId,
                });

                if (!item) {
                    return {
                        content: [
                            { text: "Library item not found.", type: "text" },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [{ text: safeJsonStringify(item), type: "text" }],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            text:
                                error instanceof Error
                                    ? error.message
                                    : "Could not retrieve the library item.",
                            type: "text",
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        "add_library_item",
        {
            description:
                "Add a new bookmark or note to the user's library. Provide a URL to create a bookmark, or noteContentText to create a note.",
            inputSchema: {
                // @ts-expect-error TODO: fix types
                caption: z
                    .string()
                    .optional()
                    .describe("Optional caption or title for the bookmark"),
                // @ts-expect-error TODO: fix types
                noteContentText: z
                    .string()
                    .optional()
                    .describe(
                        "If provided, creates a note instead of a bookmark"
                    ),
                // @ts-expect-error TODO: fix types
                url: z
                    .string()
                    .describe(
                        "The URL to save (required for bookmarks, ignored for notes)"
                    ),
            },
            title: "Add Library Item",
        },
        // @ts-expect-error TODO: fix types
        async (args, extra: McpExtra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const item = await addLibraryItem({
                    caption: args.caption,
                    noteContentText: args.noteContentText,
                    url: args.url,
                    userId,
                });

                return {
                    content: [
                        {
                            text: `Item added successfully.\n\n${safeJsonStringify(item)}`,
                            type: "text",
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            text:
                                error instanceof Error
                                    ? error.message
                                    : "Could not add the library item.",
                            type: "text",
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        "delete_library_item",
        {
            description: "Remove a library item by its ID.",
            inputSchema: {
                // @ts-expect-error TODO: fix types
                itemId: z
                    .string()
                    .describe("The unique ID of the library item to delete"),
            },
            title: "Delete Library Item",
        },
        // @ts-expect-error TODO: fix types
        async (args, extra: McpExtra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                await deleteLibraryItemMcp({ itemId: args.itemId, userId });

                return {
                    content: [
                        {
                            text: "Library item deleted successfully.",
                            type: "text",
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            text:
                                error instanceof Error
                                    ? error.message
                                    : "Could not delete the library item.",
                            type: "text",
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        "list_collections",
        {
            description: "List the user's collections with item counts.",
            inputSchema: {},
            title: "List Collections",
        },
        async (_args, extra: McpExtra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const collections = await listCollections({ userId });

                return {
                    content: [
                        {
                            text: safeJsonStringify(collections),
                            type: "text",
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            text:
                                error instanceof Error
                                    ? error.message
                                    : "Could not list collections.",
                            type: "text",
                        },
                    ],
                    isError: true,
                };
            }
        }
    );
});

export const GET = withMcpAuth(baseHandler, verifyMcpAuthToken, {
    required: true,
});
export const POST = withMcpAuth(baseHandler, verifyMcpAuthToken, {
    required: true,
});
