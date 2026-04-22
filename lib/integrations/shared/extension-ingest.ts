import "server-only";

import {
    buildLibraryItemCreateData,
    buildLibraryItemImportRow,
    buildLibraryItemUpdateData,
    libraryItemIdentityKey,
    parseOptionalDate,
    type LibraryItemImportCreateData,
    type LibraryItemImportIdentity,
    type LibraryItemImportRow,
    type LibraryItemImportUpdateData,
} from "@/lib/integrations/shared/library-item-imports";
import { LibraryItemSource } from "@/prisma/client/enums";
import { prisma } from "@/prisma";

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

function buildIngestRow(
    source: LibraryItemSource,
    item: IngestItemInput
): LibraryItemImportRow | null {
    return buildLibraryItemImportRow({
        browserProfileId: item.browserProfileId,
        caption: item.caption,
        externalId: resolveIngestExternalId(source, item),
        kind: item.kind,
        parentExternalId: item.parentExternalId,
        postedAt: parseOptionalDate(item.postedAt),
        scrapedAt: parseOptionalDate(item.scrapedAt),
        source,
        sourceDeviceId: item.sourceDeviceId,
        sourceDeviceName: item.sourceDeviceName,
        sourceMetadata: item.sourceMetadata,
        thumbnailUrl: item.thumbnailUrl,
        url: item.url,
    });
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
    sourceMetadata?: Record<string, unknown> | null;
    thumbnailUrl?: string;
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
    const libraryItemDelegate = prisma.libraryItem as unknown as {
        findMany(args: {
            select: {
                browserProfileId: true;
                externalId: true;
            };
            where: {
                OR: {
                    browserProfileId: string;
                    externalId: string;
                }[];
                source: LibraryItemSource;
                userId: string;
            };
        }): Promise<LibraryItemImportIdentity[]>;
        upsert(args: {
            create: LibraryItemImportCreateData;
            select: {
                id: true;
            };
            update: LibraryItemImportUpdateData;
            where: {
                userId_source_browserProfileId_externalId: {
                    browserProfileId: string;
                    externalId: string;
                    source: LibraryItemSource;
                    userId: string;
                };
            };
        }): Promise<{
            id: string;
        }>;
    };

    const rows = items.flatMap((item) => {
        const row = buildIngestRow(source, item);
        if (!row) {
            return [];
        }

        return [row];
    });

    if (rows.length === 0) {
        return {
            smartCollectionItemIds: [],
            upsertedCount: 0,
        };
    }

    const existingRows = await libraryItemDelegate.findMany({
        select: {
            browserProfileId: true,
            externalId: true,
        },
        where: {
            OR: rows.map((row) => ({
                browserProfileId: row.browserProfileId,
                externalId: row.externalId,
            })),
            source,
            userId,
        },
    });
    const existingKeys = new Set(
        existingRows.map((row) => libraryItemIdentityKey(row))
    );
    const smartCollectionItemIds = new Set<string>();

    for (const row of rows) {
        const rowKey = libraryItemIdentityKey(row);
        const savedRow = await libraryItemDelegate.upsert({
            create: buildLibraryItemCreateData(row, userId),
            select: {
                id: true,
            },
            update: buildLibraryItemUpdateData(row),
            where: {
                userId_source_browserProfileId_externalId: {
                    browserProfileId: row.browserProfileId,
                    externalId: row.externalId,
                    source,
                    userId,
                },
            },
        });

        if (row.kind !== "folder" && !existingKeys.has(rowKey)) {
            smartCollectionItemIds.add(savedRow.id);
        }
    }

    return {
        smartCollectionItemIds: Array.from(smartCollectionItemIds),
        upsertedCount: rows.length,
    };
}
