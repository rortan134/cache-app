import "server-only";

import { parseOptionalDate } from "@/lib/integrations/dates";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import type { LibraryItemSource } from "@/prisma/client/enums";

const CORS_HEADERS = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Max-Age": "86400",
} as const;

export function extensionIngestCorsHeaders(): HeadersInit {
    return CORS_HEADERS;
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
    kind?: "bookmark" | "folder";
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
