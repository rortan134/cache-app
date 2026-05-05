import "server-only";

import { parseOptionalDate } from "@/lib/integrations/dates";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import type {
    ITEM_KIND_BOOKMARK,
    ITEM_KIND_FOLDER,
} from "@/lib/common/constants";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import type { LibraryItemSource } from "@/prisma/client/enums";
import type * as z from "zod";

const CORS_HEADERS = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Max-Age": "86400",
} as const;

export function extensionIngestCorsHeaders(): HeadersInit {
    return CORS_HEADERS;
}

const TRUSTED_EXTENSION_ORIGIN_PATTERNS = [
    /^https:\/\/cachd\.app$/,
    /^https:\/\/[a-z0-9-]+\.cachd\.app$/,
    /^http:\/\/localhost:\d+$/,
    /^chrome-extension:\/\/.+$/,
];

function isTrustedExtensionOrigin(origin: string): boolean {
    return TRUSTED_EXTENSION_ORIGIN_PATTERNS.some((pattern) =>
        pattern.test(origin)
    );
}

/**
 * CORS headers for endpoints that rely on cookie/session credentials
 * (e.g. the extension ingest token endpoint). Reflects the request origin
 * when it matches a trusted extension origin so that credentialed
 * cross-origin requests from the extension content script succeed.
 */
export function extensionTokenCorsHeaders(request?: Request): HeadersInit {
    const origin = request?.headers.get("origin") ?? "";
    const allowOrigin =
        origin && isTrustedExtensionOrigin(origin) ? origin : "*";

    return {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
    };
}

export function parseBearerToken(request: Request): string | null {
    const raw = request.headers.get("authorization");
    if (!raw?.startsWith("Bearer ")) {
        return null;
    }
    const token = raw.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
}

/**
 * Resolves the Cache user id for an extension ingest Bearer token.
 */
export async function resolveExtensionIngestUserId(
    bearerToken: string
): Promise<string | null> {
    const byToken = await prisma.user.findFirst({
        select: { id: true },
        where: { extensionIngestToken: bearerToken },
    });
    if (byToken) {
        return byToken.id;
    }

    return resolveFallbackExtensionIngestUserId(bearerToken);
}

/**
 * Authenticates an extension ingest request by Bearer token.
 *
 * @returns The CORS headers and resolved user id, or a 401 Response if authentication fails.
 */
export async function authenticateExtensionIngest(
    request: Request
): Promise<{ cors: HeadersInit; userId: string } | Response> {
    const cors = extensionIngestCorsHeaders();
    const bearer = parseBearerToken(request);
    if (!bearer) {
        return Response.json(
            { error: "Missing Authorization: Bearer <extension ingest token>" },
            { headers: cors, status: 401 }
        );
    }

    const userId = await resolveExtensionIngestUserId(bearer);
    if (!userId) {
        return Response.json(
            { error: "Unauthorized" },
            { headers: cors, status: 401 }
        );
    }

    return { cors, userId };
}

interface ExtensionIngestImportResult {
    smartCollectionItemIds: string[];
}

interface ExtensionIngestImportConfig<
    TBody,
    TImportResult extends ExtensionIngestImportResult,
> {
    bodySchema: z.ZodType<TBody>;
    genericError: string;
    importFn: (args: { body: TBody; userId: string }) => Promise<TImportResult>;
    onSmartCollectionItemIds: (userId: string, itemIds: string[]) => void;
    response?: (args: {
        body: TBody;
        result: Omit<TImportResult, "smartCollectionItemIds">;
    }) => Record<string, unknown>;
}

export async function runExtensionIngestImport<
    TBody,
    TImportResult extends ExtensionIngestImportResult,
>(
    request: Request,
    config: ExtensionIngestImportConfig<TBody, TImportResult>
): Promise<Response> {
    const authResult = await authenticateExtensionIngest(request);
    if (authResult instanceof Response) {
        return authResult;
    }
    const { cors, userId } = authResult;

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON" },
            { headers: cors, status: 400 }
        );
    }

    const parsed = config.bodySchema.safeParse(json);
    if (!parsed.success) {
        return Response.json(
            { error: parsed.error.flatten() },
            { headers: cors, status: 400 }
        );
    }

    try {
        const result = await config.importFn({
            body: parsed.data,
            userId,
        });
        const { smartCollectionItemIds, ...response } = result;
        config.onSmartCollectionItemIds(userId, smartCollectionItemIds);

        return Response.json(
            {
                ok: true,
                ...(config.response
                    ? config.response({ body: parsed.data, result: response })
                    : response),
            },
            { headers: cors }
        );
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : config.genericError,
            },
            { headers: cors, status: 500 }
        );
    }
}

async function resolveFallbackExtensionIngestUserId(
    bearerToken: string
): Promise<string | null> {
    const envToken = process.env.INSTAGRAM_SAVED_INGEST_TOKEN?.trim();
    if (!envToken || bearerToken !== envToken) {
        return null;
    }

    const fallbackUserId = process.env.EXTENSION_FALLBACK_USER_ID;
    if (!fallbackUserId) {
        return null;
    }

    const user = await prisma.user.findUnique({
        select: { id: true },
        where: { id: fallbackUserId },
    });
    return user?.id ?? null;
}

export interface IngestItemInput {
    browserProfileId?: string;
    caption?: string;
    externalId?: string;
    kind?: typeof ITEM_KIND_BOOKMARK | typeof ITEM_KIND_FOLDER;
    parentExternalId?: string;
    postedAt?: string;
    scrapedAt?: string;
    sourceDeviceId?: string;
    sourceDeviceName?: string;
    sourceMetadata?: Record<string, unknown> | null;
    url: string;
}

/**
 * Upserts library rows for one ingest payload (chunk or complete).
 */
export async function upsertLibraryItemsFromIngest(
    userId: string,
    source: LibraryItemSource,
    items: IngestItemInput[]
): Promise<{
    smartCollectionItemIds: string[];
    upsertedCount: number;
}> {
    const result = await upsertLibraryItemImports({
        items: items.map((item) => ({
            browserProfileId: item.browserProfileId,
            caption: item.caption,
            externalId: item.externalId,
            kind: item.kind,
            parentExternalId: item.parentExternalId,
            postedAt: parseOptionalDate(item.postedAt),
            scrapedAt: parseOptionalDate(item.scrapedAt),
            sourceDeviceId: item.sourceDeviceId,
            sourceDeviceName: item.sourceDeviceName,
            sourceMetadata:
                item.sourceMetadata as Prisma.InputJsonObject | null,
            url: item.url,
        })),
        source,
        userId,
    });

    return {
        smartCollectionItemIds: result.smartCollectionItemIds,
        upsertedCount: result.upsertedCount,
    };
}
