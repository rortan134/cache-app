import { LibraryCollectionError } from "@/lib/collections/error";
import {
    getLibraryItem,
    listCollections,
    listLibraryItems,
} from "@/lib/collections/service";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    MCP_SCOPES,
    type McpScope,
    verifyMcpAuthToken,
} from "@/lib/integrations/mcp/auth";
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
import {
    MCP_RATE_BUCKETS,
    incrementMcpRateCounter,
    isOverLimit,
} from "@/lib/integrations/mcp/rate-limit";
import {
    addLibraryItem,
    deleteLibraryItemMcp,
    toMcpLibraryItem,
} from "@/lib/integrations/mcp/service";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
    CallToolResult,
    ServerNotification,
    ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod/v4";

const log = createLogger("mcp.route");

// Upstream PR modelcontextprotocol/typescript-sdk#1990 fixes the AnySchema
// type-identity leak; once it ships in a release, drop this comment.
// `CallToolResult.structuredContent` is typed as `{[x: string]: unknown}` by
// the SDK. Our richer `McpLibraryItem` interface narrows the shape too far to
// structurally fit; the runtime payload conforms, so we cast at the boundary.
function asStructured<T extends object>(value: T): Record<string, unknown> {
    return value as unknown as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Result helpers. Tool handlers return either a typed `structuredContent`
// (paired with `outputSchema`) or a fallback text result on errors so SDK
// clients always get useful feedback.
// ---------------------------------------------------------------------------

type McpExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

function resolveAuth(extra: McpExtra): {
    scopes: McpScope[];
    userId: string;
} | null {
    const authInfo = extra.authInfo;
    let userId: string | null = null;
    if (typeof authInfo?.extra?.userId === "string") {
        userId = authInfo.extra.userId;
    } else if (typeof authInfo?.clientId === "string") {
        userId = authInfo.clientId;
    }
    if (!userId) {
        return null;
    }
    const scopes = (authInfo?.scopes ?? []).filter((scope): scope is McpScope =>
        (MCP_SCOPES as readonly string[]).includes(scope)
    );
    return { scopes, userId };
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

function insufficientScopeResult(needed: McpScope): CallToolResult {
    return {
        content: [
            {
                text: `Forbidden: token grants fewer scopes than required for this tool (need \`${needed}\`).`,
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
 * Validate the resolved auth before executing a tool. `required` is the scope
 * the tool needs to run. Returning a `CallToolResult` short-circuits the
 * tool call with a structured "user-facing" error so MCP clients can adapt
 * (rotate to a write-capable token, etc.) instead of receiving an opaque
 * `tools/call` exception.
 *
 * The `auth.scopes.includes(required)` check filters out read-only tokens
 * for write-capable tools, so a future exporters/observability integration
 * running with `library:read` cannot upsert or delete library data.
 */
async function authorizeToolCall(
    extra: McpExtra,
    required: McpScope
): Promise<{ userId: string } | { result: CallToolResult }> {
    const auth = resolveAuth(extra);
    if (!auth) {
        return { result: unauthorizedResult() };
    }
    if (!auth.scopes.includes(required)) {
        return { result: insufficientScopeResult(required) };
    }
    const bucket =
        required === "library:write"
            ? MCP_RATE_BUCKETS.write
            : MCP_RATE_BUCKETS.read;
    const decision = await incrementMcpRateCounter(auth.userId, bucket);
    if (decision !== null && isOverLimit(decision, bucket)) {
        return { result: rateLimitResult(bucket, decision) };
    }
    return { userId: auth.userId };
}

function rateLimitResult(
    bucket: { limit: number; name: string },
    decision: { retryAfterSeconds: number }
): CallToolResult {
    log.warn(`rate limit hit (${bucket.name})`, {
        retryAfterSeconds: decision.retryAfterSeconds,
    });
    return {
        content: [
            {
                text: `Rate limit reached for \`${bucket.name}\` operations. Retry in about ${decision.retryAfterSeconds} seconds.`,
                type: "text",
            },
        ],
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
    const auth = await authorizeToolCall(extra, "library:read");
    if ("result" in auth) {
        return auth.result;
    }
    const { userId } = auth;

    try {
        const { items, total } = await listLibraryItems({
            collectionId: args.collectionId,
            limit: args.limit,
            offset: args.offset,
            search: args.search,
            userId,
        });
        const mcpItems = items.map(toMcpLibraryItem);
        const nextOffset = args.offset + args.limit;
        const hasMore = total > nextOffset;
        const payload = {
            hasMore,
            items: mcpItems,
            nextOffset: hasMore ? nextOffset : undefined,
            offset: args.offset,
            total,
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
    const auth = await authorizeToolCall(extra, "library:read");
    if ("result" in auth) {
        return auth.result;
    }
    const { userId } = auth;

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
    const auth = await authorizeToolCall(extra, "library:write");
    if ("result" in auth) {
        return auth.result;
    }
    const { userId } = auth;

    // The input schema is `noteContentText | url`, so only one branch can be
    // present in any given parse. The XOR previously lived in `superRefine`
    // (protocol.ts) but the MCP SDK normalizes raw shapes field-by-field and
    // drops cross-field rules; the union moves the constraint onto the wire.
    const noteContentText =
        "noteContentText" in args ? args.noteContentText : undefined;
    const url = "url" in args ? args.url : undefined;
    const caption = "caption" in args ? args.caption : undefined;

    try {
        const item = await addLibraryItem({
            caption,
            noteContentText,
            url,
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
    const auth = await authorizeToolCall(extra, "library:write");
    if ("result" in auth) {
        return auth.result;
    }
    const { userId } = auth;

    try {
        await deleteLibraryItemMcp({ itemId: args.itemId, userId });
        const payload = McpDeleteLibraryItemOutputSchema.parse({ ok: true });
        return {
            content: [{ text: "Library item deleted.", type: "text" }],
            structuredContent: asStructured(payload),
        };
    } catch (error) {
        if (
            error instanceof LibraryCollectionError &&
            error.data.code === "not_found"
        ) {
            // Treat already-deleted as a successful no-op so MCP clients can
            // retry safely after a network blip. The tool's `outputSchema`
            // (and the `{ ok: true }` payload) is unchanged so callers that
            // rely on the typed result can keep doing so without branching.
            const payload = McpDeleteLibraryItemOutputSchema.parse({
                ok: true,
            });
            return {
                content: [
                    {
                        text: "Library item was already removed.",
                        type: "text",
                    },
                ],
                structuredContent: asStructured(payload),
            };
        }
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
    const auth = await authorizeToolCall(extra, "library:read");
    if ("result" in auth) {
        return auth.result;
    }
    const { userId } = auth;

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
                    "List library items for the authenticated user. Supports optional `search` (substring match across captions, URLs, and note text), optional `collectionId` filter, and paginated results via `limit`/`offset`. Returns `hasMore` and `nextOffset` for pagination. Read-only; idempotent.",
                inputSchema: McpLibraryItemListInputSchema.shape,
                outputSchema: McpLibraryItemListOutputSchema.shape,
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
                inputSchema: McpGetLibraryItemInputSchema.shape,
                outputSchema: McpLibraryItemSchema.shape,
                title: "Get Library Item",
            },
            handleGetLibraryItem
        );

        server.registerTool(
            "add_library_item",
            {
                annotations: LibAnn.Mutating,
                description:
                    "Save a new item to the user's library. Two shapes are accepted (the schema is `oneOf`): provide `{ url, caption? }` to save a bookmark (dedupes by URL so re-saving is safe), or `{ noteContentText }` to save a note. Sending both or neither is rejected at validation time.",
                inputSchema: McpAddLibraryItemInputSchema,
                outputSchema: McpLibraryItemSchema.shape,
                title: "Add Library Item",
            },
            handleAddLibraryItem
        );

        server.registerTool(
            "delete_library_item",
            {
                annotations: {
                    ...LibAnn.Destructive,
                    idempotentHint: true,
                },
                description:
                    "Delete a library item by ID. Idempotent — calling on an already-deleted item returns ok.",
                inputSchema: McpDeleteLibraryItemInputSchema.shape,
                outputSchema: McpDeleteLibraryItemOutputSchema.shape,
                title: "Delete Library Item",
            },
            handleDeleteLibraryItem
        );

        server.registerTool(
            "list_collections",
            {
                annotations: LibAnn.ReadOnly,
                description:
                    "List the authenticated user's collections with item counts. Read-only; idempotent.",
                inputSchema: EMPTY_INPUT_SCHEMA.shape,
                outputSchema: McpCollectionListOutputSchema.shape,
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

// `withMcpAuth` runs first so the SDK's MCP response headers (`Mcp-Session-Id`,
// streaming) are produced cleanly. `required: false` lets `initialize` and
// `tools/list` succeed without a token (or with a `library:read` token)
// so clients can introspect server info / discover tools before they ask
// for credentials. Per-handler gating (`authorizeToolCall`) then enforces
// the right scope for any actual read or write.
const authWrapper = (handler: typeof baseHandler) =>
    withMcpAuth(handler, verifyMcpAuthToken, {
        required: false,
    });

// Re-export as both methods so the route works regardless of transport.
const handler = authWrapper(baseHandler);

/**
 * CORS preflight answer. Browser-based MCP clients cannot bypass
 * `withMcpAuth` — it runs before any handler in the route — but a CORS
 * preflight (OPTIONS) carries no Bearer token, so without this stub the
 * preflight is rejected with 401 and the browser refuses to send the real
 * POST. We answer preflights here with the same CORS posture mcp-handler
 * uses for `protectedResourceHandler` (echo the Origin, allow `POST` +
 * streamable transport headers) and never include the Authorization header
 * in the allowed list publicly — origin-allow-listed clients can still
 * attach it themselves.
 */
const CORS_ALLOWED_HEADERS = "authorization,content-type,accept,mcp-session-id";
const CORS_ALLOWED_METHODS = "POST, GET, OPTIONS";
const CORS_MAX_AGE = "86400";

function isAllowedOrigin(origin: string): boolean {
    if (!origin) {
        return false;
    }
    try {
        const url = new URL(origin);
        const host = url.hostname;
        return (
            host === "cachd.app" ||
            host.endsWith(".cachd.app") ||
            host === "localhost" ||
            host === "127.0.0.1"
        );
    } catch {
        return false;
    }
}

export function OPTIONS(request: Request): Response {
    const origin = request.headers.get("origin") ?? "";
    const headers = new Headers({
        "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
        "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
        "Access-Control-Max-Age": CORS_MAX_AGE,
        Vary: "Origin",
    });
    if (isAllowedOrigin(origin)) {
        // `*` would block the use of `Authorization`. Echo back the
        // request's Origin so the browser can pair the preflight with the
        // credentialed real request.
        headers.set("Access-Control-Allow-Origin", origin);
        headers.append("Vary", "Access-Control-Request-Headers");
    }
    return new Response(null, { headers, status: 204 });
}

export const GET = handler;
export const POST = handler;
