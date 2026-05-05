import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
    CallToolResult,
    ServerNotification,
    ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v3";
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

type McpExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type McpToolArgs = Record<string, unknown>;
type McpToolCallback = (
    args: McpToolArgs,
    extra: McpExtra
) => CallToolResult | Promise<CallToolResult>;
type RegisterMcpTool = (
    name: string,
    config: {
        description?: string;
        inputSchema?: Record<string, z.ZodTypeAny>;
        title?: string;
    },
    callback: McpToolCallback
) => void;

interface ListLibraryItemsToolArgs {
    collectionId?: string;
    limit?: number;
    search?: string;
}

interface GetLibraryItemToolArgs {
    itemId: string;
}

interface AddLibraryItemToolArgs {
    caption?: string;
    noteContentText?: string;
    url: string;
}

const UNAUTHORIZED_RESULT = {
    content: [
        {
            text: "Unauthorized: missing or invalid token.",
            type: "text" as const,
        },
    ],
    isError: true as const,
} satisfies CallToolResult;

const LIST_LIBRARY_ITEMS_INPUT_SCHEMA: Record<
    keyof ListLibraryItemsToolArgs,
    z.ZodTypeAny
> = {
    collectionId: z
        .string()
        .optional()
        .describe("Filter results to a specific collection ID"),
    limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum number of items to return (default 20, max 50)"),
    search: z
        .string()
        .optional()
        .describe("Search query matched against captions, URLs, and note text"),
};

const GET_LIBRARY_ITEM_INPUT_SCHEMA: Record<
    keyof GetLibraryItemToolArgs,
    z.ZodTypeAny
> = {
    itemId: z
        .string()
        .describe("The unique ID of the library item to retrieve"),
};

const ADD_LIBRARY_ITEM_INPUT_SCHEMA: Record<
    keyof AddLibraryItemToolArgs,
    z.ZodTypeAny
> = {
    caption: z.string().optional().describe("Optional caption or title"),
    noteContentText: z
        .string()
        .optional()
        .describe("If provided, creates a note instead of a bookmark"),
    url: z
        .string()
        .describe(
            "The URL to save (required for bookmarks, ignored for notes)"
        ),
};
const EMPTY_INPUT_SCHEMA: Record<string, z.ZodTypeAny> = {};

function resolveUserId(extra: McpExtra): string | undefined {
    const userId = extra.authInfo?.extra?.userId;
    return typeof userId === "string" ? userId : undefined;
}

function safeJsonStringify(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

function textResult(text: string): CallToolResult {
    return {
        content: [{ text, type: "text" }],
    };
}

function errorResult(error: unknown, fallback: string): CallToolResult {
    return {
        content: [
            {
                text: error instanceof Error ? error.message : fallback,
                type: "text",
            },
        ],
        isError: true,
    };
}

function readOptionalStringArg(
    args: McpToolArgs,
    key: string
): string | undefined {
    const value = args[key];
    return typeof value === "string" ? value : undefined;
}

function readOptionalNumberArg(
    args: McpToolArgs,
    key: string
): number | undefined {
    const value = args[key];
    return typeof value === "number" ? value : undefined;
}

function readRequiredStringArg(args: McpToolArgs, key: string): string {
    const value = readOptionalStringArg(args, key);
    if (!value) {
        throw new Error(`Missing required string argument: ${key}`);
    }
    return value;
}

function readListLibraryItemsToolArgs(
    args: McpToolArgs
): ListLibraryItemsToolArgs {
    return {
        collectionId: readOptionalStringArg(args, "collectionId"),
        limit: readOptionalNumberArg(args, "limit"),
        search: readOptionalStringArg(args, "search"),
    };
}

function readGetLibraryItemToolArgs(args: McpToolArgs): GetLibraryItemToolArgs {
    return {
        itemId: readRequiredStringArg(args, "itemId"),
    };
}

function readAddLibraryItemToolArgs(args: McpToolArgs): AddLibraryItemToolArgs {
    return {
        caption: readOptionalStringArg(args, "caption"),
        noteContentText: readOptionalStringArg(args, "noteContentText"),
        url: readRequiredStringArg(args, "url"),
    };
}

const baseHandler = createMcpHandler((server) => {
    const dynamicServer: object = server;
    const registerTool: RegisterMcpTool = (name, config, callback) => {
        const registerToolMethod = Reflect.get(dynamicServer, "registerTool");
        if (typeof registerToolMethod !== "function") {
            throw new TypeError("MCP server does not expose registerTool.");
        }
        Reflect.apply(registerToolMethod, dynamicServer, [
            name,
            config,
            callback,
        ]);
    };

    registerTool(
        "list_library_items",
        {
            description:
                "List library items for the authenticated user. Supports optional search, collection filtering, and pagination limit.",
            inputSchema: LIST_LIBRARY_ITEMS_INPUT_SCHEMA,
            title: "List Library Items",
        },
        async (args, extra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const input = readListLibraryItemsToolArgs(args);
                const items = await listLibraryItems({
                    collectionId: input.collectionId,
                    limit: input.limit,
                    search: input.search,
                    userId,
                });

                return textResult(safeJsonStringify(items));
            } catch (error) {
                return errorResult(error, "Could not list library items.");
            }
        }
    );

    registerTool(
        "get_library_item",
        {
            description: "Retrieve a single library item by its ID.",
            inputSchema: GET_LIBRARY_ITEM_INPUT_SCHEMA,
            title: "Get Library Item",
        },
        async (args, extra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const input = readGetLibraryItemToolArgs(args);
                const item = await getLibraryItem({
                    itemId: input.itemId,
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

                return textResult(safeJsonStringify(item));
            } catch (error) {
                return errorResult(
                    error,
                    "Could not retrieve the library item."
                );
            }
        }
    );

    registerTool(
        "add_library_item",
        {
            description:
                "Add a new bookmark or note to the user's library. Provide a URL to create a bookmark, or noteContentText to create a note.",
            inputSchema: ADD_LIBRARY_ITEM_INPUT_SCHEMA,
            title: "Add Library Item",
        },
        async (args, extra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const input = readAddLibraryItemToolArgs(args);
                const item = await addLibraryItem({
                    caption: input.caption,
                    noteContentText: input.noteContentText,
                    url: input.url,
                    userId,
                });

                return textResult(
                    `Item added successfully.\n\n${safeJsonStringify(item)}`
                );
            } catch (error) {
                return errorResult(error, "Could not add the library item.");
            }
        }
    );

    registerTool(
        "delete_library_item",
        {
            description: "Remove a library item by its ID.",
            inputSchema: GET_LIBRARY_ITEM_INPUT_SCHEMA,
            title: "Delete Library Item",
        },
        async (args, extra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const input = readGetLibraryItemToolArgs(args);
                await deleteLibraryItemMcp({ itemId: input.itemId, userId });

                return textResult("Library item deleted successfully.");
            } catch (error) {
                return errorResult(error, "Could not delete the library item.");
            }
        }
    );

    registerTool(
        "list_collections",
        {
            description: "List the user's collections with item counts.",
            inputSchema: EMPTY_INPUT_SCHEMA,
            title: "List Collections",
        },
        async (_args, extra) => {
            const userId = resolveUserId(extra);
            if (!userId) {
                return UNAUTHORIZED_RESULT;
            }

            try {
                const collections = await listCollections({ userId });

                return textResult(safeJsonStringify(collections));
            } catch (error) {
                return errorResult(error, "Could not list collections.");
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
