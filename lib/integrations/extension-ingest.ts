import "server-only";

import { parseOptionalDate } from "@/lib/integrations/dates";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import { LibraryItemSource } from "@/prisma/client/enums";

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
    const t = raw.slice("Bearer ".length).trim();
    return t.length > 0 ? t : null;
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
    const fallbackUserId = process.env.EXTENSION_FALLBACK_USER_ID;
    if (!(envToken && fallbackUserId) || bearerToken !== envToken) {
        return null;
    }

    const user = await prisma.user.findUnique({
        select: { id: true },
        where: { id: fallbackUserId },
    });
    return user?.id ?? null;
}

export function normalizeLibrarySource(
    raw: string | undefined
): LibraryItemSource {
    switch (raw?.trim().toLowerCase()) {
        case "tiktok":
            return LibraryItemSource.tiktok;
        case "chrome":
        case "chrome_bookmarks":
            return LibraryItemSource.chrome_bookmarks;
        default:
            return LibraryItemSource.instagram;
    }
}

function resolveIngestExternalId(
    source: LibraryItemSource,
    item: IngestItemInput
): string | undefined {
    return source === LibraryItemSource.instagram ? item.shortcode : item.id;
}

export interface IngestItemInput {
    browserProfileId?: string;
    caption?: string;
    id?: string;
    kind?: "bookmark" | "folder";
    parentExternalId?: string;
    postedAt?: string;
    scrapedAt?: string;
    shortcode?: string;
    sourceDeviceId?: string;
    sourceDeviceName?: string;
    sourceMetadata?: Prisma.InputJsonObject | null;
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
            externalId: resolveIngestExternalId(source, item),
            kind: item.kind,
            parentExternalId: item.parentExternalId,
            postedAt: parseOptionalDate(item.postedAt),
            scrapedAt: parseOptionalDate(item.scrapedAt),
            sourceDeviceId: item.sourceDeviceId,
            sourceDeviceName: item.sourceDeviceName,
            sourceMetadata: item.sourceMetadata,
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
