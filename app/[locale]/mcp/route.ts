import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
    CallToolResult,
    ServerNotification,
    ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import {
    getLibraryItem,
    listCollections,
    listLibraryItems,
} from "@/lib/collections/service";
import { createLogger } from "@/lib/common/logs/console/logger";
import { verifyMcpAuthToken } from "@/lib/integrations/mcp/auth";
import {
    addLibraryItem,
    deleteLibraryItemMcp,
    toMcpLibraryItem,
} from "@/lib/integrations/mcp/service";
import {
    McpAddLibraryItemInputSchema,
    McpCollectionListOutputSchema,
    McpDeleteLibraryItemInputSchema,
    McpDeleteLibraryItemOutputSchema,
    McpGetLibraryItemInputSchema,
    McpLibraryItemListInputSchema,
    McpLibraryItemListOutputSchema,
    McpLibraryItemSchema,
} from "@/lib/integrations/mcp/protocol";

const log = createLogger("mcp.route");

const MCP_REQUIRED_SCOPES = ["library:read", "library:write"] as const;

// Tool registration in `@modelcontextprotocol/sdk@1.29` types its
// `inputSchema`/`outputSchema` as `ZodRawShapeCompat = Record<string, AnySchema>`,
// where `AnySchema = z3.ZodTypeAny | z4.$ZodType`. Under TypeScript 6 with
// zod v4.4, bare zod v4 schemas do not structurally satisfy that union. The
// SDK re-validates any schema at runtime via `normalizeObjectSchema`, so we
// cast each schema field at the boundary. `mcpShape` erases the schema's
// structural type to `Record<string, never>` — `never` is assignable to every
// other type, so the constraint is satisfied without an `any` cast (and thus
// without polluting the linter).

// `CallToolResult.structuredContent` is typed as `{[x: string]: unknown}` by
// the SDK. Our richer `McpLibraryItem` interface narrows the shape too far to
// structurally fit; the runtime payload conforms, so we cast at the boundary.
function asStructured<T extends object>(value: T): Record<string, unknown> {
    return value as unknown as Record<string, unknown>;
}

function mcpShape(shape: object): Record<string, never> {
    return shape as unknown as Record<string, never>;
}

// ---------------------------------------------------------------------------
// Result helpers. Tool handlers return either a typed `structuredContent`
// (paired with `outputSchema`) or a fallback text result on errors so SDK
// clients always get useful feedback.
// ---------------------------------------------------------------------------

type McpExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

function resolveUserId(extra: McpExtra): string | undefined {
    const authInfo = extra.authInfo;
    const userId = authInfo?.extra?.userId;
    return typeof userId === "string" ? userId : authInfo?.clientId;
}

function unauthorizedResult(): CallToolResult {
    return {
        content: [
            {
                text: "Unauthorized: missing or invalid token.",
                type: "text",
            },
        ],
        isError: true,
    };
}

function textErrorResult(message: string): CallToolResult {
    return {
        content: [{ text: message, type: "text" }],
        isError: true,
    };
}

/**
 * Logs the underlying error with full context and returns a stable,
 * machine-readable message to the MCP client. We never echo
 * `error.message` because it can carry DB schema names, stack paths, or
 * third-party API hints that aid an attacker probing the integration.
 */
function handleToolError(
    toolName: string,
    fallbackMessage: string,
    userId: string,
    error: unknown
): CallToolResult {
    log.error(`${toolName} failed`, { error, userId });
    return textErrorResult(fallbackMessage);
}

// ---------------------------------------------------------------------------
// Tool handlers. The MCP SDK validates input against `inputSchema` before
// invoking the callback, so the typed `args` are already safe.
// ---------------------------------------------------------------------------

async function handleListLibraryItems(
    args: z.infer<typeof McpLibraryItemListInputSchema>,
    extra: McpExtra
): Promise<CallToolResult> {
    const userId = resolveUserId(extra);
    if (!userId) {
        return unauthorizedResult();
    }

    try {
        const items = await listLibraryItems({
            collectionId: args.collectionId,
            limit: args.limit,
            search: args.search,
            userId,
        });
        const payload = {
            items: items.map(toMcpLibraryItem),
            total: items.length,
        };
        return {
            content: [{ text: JSON.stringify(payload), type: "text" }],
            structuredContent: asStructured(payload),
        };
    } catch (error) {
        return handleToolError(
            "list_library_items",
            "Could not list library items.",
            userId,
            error
        );
    }
}

async function handleGetLibraryItem(
    args: z.infer<typeof McpGetLibraryItemInputSchema>,
    extra: McpExtra
): Promise<CallToolResult> {
    const userId = resolveUserId(extra);
    if (!userId) {
        return unauthorizedResult();
    }

    try {
        const item = await getLibraryItem({
            itemId: args.itemId,
            userId,
        });
        if (!item) {
            return textErrorResult("Library item not found.");
        }
        const payload = toMcpLibraryItem(item);
        return {
            content: [{ text: JSON.stringify(payload), type: "text" }],
            structuredContent: asStructured(payload),
        };
    } catch (error) {
        return handleToolError(
            "get_library_item",
            "Could not retrieve the library item.",
            userId,
            error
        );
    }
}

async function handleAddLibraryItem(
    args: z.infer<typeof McpAddLibraryItemInputSchema>,
    extra: McpExtra
): Promise<CallToolResult> {
    const userId = resolveUserId(extra);
    if (!userId) {
        return unauthorizedResult();
    }

    try {
        const item = await addLibraryItem({
            caption: args.caption,
            noteContentText: args.noteContentText,
            url: args.url,
            userId,
        });
        const payload = toMcpLibraryItem(item);
        return {
            content: [
                { text: `Saved. ${JSON.stringify(payload)}`, type: "text" },
            ],
            structuredContent: asStructured(payload),
        };
    } catch (error) {
        return handleToolError(
            "add_library_item",
            "Could not save the library item.",
            userId,
            error
        );
    }
}

async function handleDeleteLibraryItem(
    args: z.infer<typeof McpDeleteLibraryItemInputSchema>,
    extra: McpExtra
): Promise<CallToolResult> {
    const userId = resolveUserId(extra);
    if (!userId) {
        return unauthorizedResult();
    }

    try {
        await deleteLibraryItemMcp({ itemId: args.itemId, userId });
        const payload = McpDeleteLibraryItemOutputSchema.parse({ ok: true });
        return {
            content: [{ text: "Library item deleted.", type: "text" }],
            structuredContent: asStructured(payload),
        };
    } catch (error) {
        return handleToolError(
            "delete_library_item",
            "Could not delete the library item.",
            userId,
            error
        );
    }
}

async function handleListCollections(
    _args: Record<string, never>,
    extra: McpExtra
): Promise<CallToolResult> {
    const userId = resolveUserId(extra);
    if (!userId) {
        return unauthorizedResult();
    }

    try {
        const collections = await listCollections({ userId });
        const payload = {
            collections: collections.map((c) => ({
                id: c.id,
                itemCount: c.itemCount,
                name: c.name,
            })),
            total: collections.length,
        };
        return {
            content: [{ text: JSON.stringify(payload), type: "text" }],
            structuredContent: asStructured(payload),
        };
    } catch (error) {
        return handleToolError(
            "list_collections",
            "Could not list collections.",
            userId,
            error
        );
    }
}

const EMPTY_INPUT_SCHEMA = z.object({});

const LibAnn = {
    Destructive: {
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
        readOnlyHint: false,
    },
    Mutating: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
        readOnlyHint: false,
    },
    ReadOnly: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
    },
} as const;

// ---------------------------------------------------------------------------
// MCP server bootstrap.
// ---------------------------------------------------------------------------

const baseHandler = createMcpHandler(
    (server: McpServer) => {
        server.registerTool(
            "list_library_items",
            {
                annotations: LibAnn.ReadOnly,
                description:
                    "List library items for the authenticated user. Supports optional `search` (substring match across captions, URLs, and note text) and optional `collectionId` filter. Read-only; idempotent.",
                inputSchema: mcpShape(McpLibraryItemListInputSchema.shape),
                outputSchema: mcpShape(McpLibraryItemListOutputSchema.shape),
                title: "List Library Items",
            },
            handleListLibraryItems
        );

        server.registerTool(
            "get_library_item",
            {
                annotations: LibAnn.ReadOnly,
                description:
                    "Fetch a single library item by ID. Read-only; returns not-found text when the ID does not exist for the user.",
                inputSchema: mcpShape(McpGetLibraryItemInputSchema.shape),
                outputSchema: mcpShape(McpLibraryItemSchema.shape),
                title: "Get Library Item",
            },
            // biome-ignore lint/suspicious/noExplicitAny: SDK type variance — required-arg handlers
            handleGetLibraryItem as any
        );

        server.registerTool(
            "add_library_item",
            {
                annotations: LibAnn.Mutating,
                description:
                    "Save a new item to the user's library. Provide `url` to save a bookmark (dedupes by URL so re-saving is safe) or `noteContentText` to save a note. `caption` is optional for bookmarks. Never pass both `url` and `noteContentText` — the call will error.",
                inputSchema: mcpShape(McpAddLibraryItemInputSchema.shape),
                outputSchema: mcpShape(McpLibraryItemSchema.shape),
                title: "Add Library Item",
            },
            handleAddLibraryItem
        );

        server.registerTool(
            "delete_library_item",
            {
                annotations: LibAnn.Destructive,
                description:
                    "Delete a library item by ID. Destructive; not idempotent (a second call fails).",
                inputSchema: mcpShape(McpDeleteLibraryItemInputSchema.shape),
                outputSchema: mcpShape(McpDeleteLibraryItemOutputSchema.shape),
                title: "Delete Library Item",
            },
            // biome-ignore lint/suspicious/noExplicitAny: SDK type variance — required-arg handlers
            handleDeleteLibraryItem as any
        );

        server.registerTool(
            "list_collections",
            {
                annotations: LibAnn.ReadOnly,
                description:
                    "List the authenticated user's collections with item counts. Read-only; idempotent.",
                inputSchema: mcpShape(EMPTY_INPUT_SCHEMA.shape),
                outputSchema: mcpShape(McpCollectionListOutputSchema.shape),
                title: "List Collections",
            },
            handleListCollections
        );
    },
    {
        serverInfo: {
            name: "cache",
            version: "1.0.0",
        },
    }
);

const authWrapper = (handler: typeof baseHandler) =>
    withMcpAuth(handler, verifyMcpAuthToken, {
        required: true,
        requiredScopes: [...MCP_REQUIRED_SCOPES],
    });

const handler = authWrapper(baseHandler);

export const GET = handler;
export const POST = handler;
