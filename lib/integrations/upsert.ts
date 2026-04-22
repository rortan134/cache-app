import "server-only";

import {
    buildLibraryItemCreateData,
    buildLibraryItemImportRow,
    buildLibraryItemUpdateData,
    libraryItemIdentityKey,
    type LibraryItemImportRow,
    type LibraryItemImportRowInput,
} from "@/lib/integrations/library-item-imports";
import { prisma } from "@/prisma";
import type { LibraryItemSource } from "@/prisma/client/enums";

export interface UpsertLibraryItemImportsArgs {
    items: Omit<LibraryItemImportRowInput, "source">[];
    shouldAddToSmartCollections?: (row: LibraryItemImportRow) => boolean;
    source: LibraryItemSource;
    userId: string;
}

export interface UpsertLibraryItemImportsResult {
    skippedCount: number;
    smartCollectionItemIds: string[];
    upsertedCount: number;
}

function normalizeImportRows(args: UpsertLibraryItemImportsArgs): {
    skippedCount: number;
    rows: LibraryItemImportRow[];
} {
    const rowsByIdentity = new Map<string, LibraryItemImportRow>();
    let skippedCount = 0;

    for (const item of args.items) {
        const row = buildLibraryItemImportRow({
            ...item,
            source: args.source,
        });

        if (!row) {
            skippedCount += 1;
            continue;
        }

        rowsByIdentity.set(libraryItemIdentityKey(row), row);
    }

    return {
        rows: [...rowsByIdentity.values()],
        skippedCount,
    };
}

export async function upsertLibraryItemImports(
    args: UpsertLibraryItemImportsArgs
): Promise<UpsertLibraryItemImportsResult> {
    const { rows, skippedCount } = normalizeImportRows(args);
    if (rows.length === 0) {
        return {
            skippedCount,
            smartCollectionItemIds: [],
            upsertedCount: 0,
        };
    }

    const existingRows = await prisma.libraryItem.findMany({
        select: {
            browserProfileId: true,
            externalId: true,
        },
        where: {
            OR: rows.map((row) => ({
                browserProfileId: row.browserProfileId,
                externalId: row.externalId,
            })),
            source: args.source,
            userId: args.userId,
        },
    });
    const existingKeys = new Set(
        existingRows.map((row) => libraryItemIdentityKey(row))
    );
    const smartCollectionItemIds = new Set<string>();
    const shouldAddToSmartCollections =
        args.shouldAddToSmartCollections ??
        ((row: LibraryItemImportRow) => row.kind !== "folder");

    for (const row of rows) {
        const savedRow = await prisma.libraryItem.upsert({
            create: buildLibraryItemCreateData(row, args.userId),
            select: {
                id: true,
            },
            update: buildLibraryItemUpdateData(row),
            where: {
                userId_source_browserProfileId_externalId: {
                    browserProfileId: row.browserProfileId,
                    externalId: row.externalId,
                    source: args.source,
                    userId: args.userId,
                },
            },
        });

        if (
            shouldAddToSmartCollections(row) &&
            !existingKeys.has(libraryItemIdentityKey(row))
        ) {
            smartCollectionItemIds.add(savedRow.id);
        }
    }

    return {
        skippedCount,
        smartCollectionItemIds: [...smartCollectionItemIds],
        upsertedCount: rows.length,
    };
}
