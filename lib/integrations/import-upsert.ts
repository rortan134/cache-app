import "server-only";

import { chunk, mapConcurrent } from "@/lib/common/arrays";
import { ITEM_KIND_FOLDER } from "@/lib/common/constants";
import {
    buildLibraryItemCreateData,
    buildLibraryItemImportRow,
    buildLibraryItemUpdateData,
    libraryItemIdentityKey,
    type LibraryItemImportRow,
    type LibraryItemImportRowInput,
} from "@/lib/integrations/import-row";
import { prisma } from "@/prisma";
import type { LibraryItemSource } from "@/prisma/client/enums";

const EXISTING_IMPORT_LOOKUP_BATCH_SIZE = 250;
const EXISTING_IMPORT_LOOKUP_CONCURRENCY = 4;
const IMPORT_UPSERT_CONCURRENCY = 4;

type ExistingImportRow = Pick<
    LibraryItemImportRow,
    "browserProfileId" | "externalId"
> & { deletedAt: Date | null };

interface UpsertLibraryItemImportsArgs {
    items: Omit<LibraryItemImportRowInput, "source">[];
    shouldAddToSmartCollections?: (row: LibraryItemImportRow) => boolean;
    source: LibraryItemSource;
    userId: string;
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

interface UpsertLibraryItemImportsResult {
    skippedCount: number;
    smartCollectionItemIds: string[];
    upsertedCount: number;
}

async function findExistingImportRows(args: {
    rows: LibraryItemImportRow[];
    source: LibraryItemSource;
    userId: string;
}): Promise<ExistingImportRow[]> {
    const batches = chunk(args.rows, EXISTING_IMPORT_LOOKUP_BATCH_SIZE);
    const batchResults = await mapConcurrent(
        batches,
        (batch) =>
            prisma.libraryItem.findMany({
                select: {
                    browserProfileId: true,
                    deletedAt: true,
                    externalId: true,
                },
                where: {
                    OR: batch.map((row) => ({
                        browserProfileId: row.browserProfileId,
                        externalId: row.externalId,
                    })),
                    source: args.source,
                    userId: args.userId,
                },
            }),
        EXISTING_IMPORT_LOOKUP_CONCURRENCY
    );

    return batchResults.flat();
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

    const existingRows = await findExistingImportRows({
        rows,
        source: args.source,
        userId: args.userId,
    });
    const liveKeys = new Set(
        existingRows
            .filter((row) => row.deletedAt === null)
            .map((row) => libraryItemIdentityKey(row))
    );
    const tombstonedKeys = new Set(
        existingRows
            .filter((row) => row.deletedAt !== null)
            .map((row) => libraryItemIdentityKey(row))
    );
    const upsertableRows = rows.filter(
        (row) => !tombstonedKeys.has(libraryItemIdentityKey(row))
    );
    const smartCollectionItemIds = new Set<string>();
    const shouldAddToSmartCollections =
        args.shouldAddToSmartCollections ??
        ((row: LibraryItemImportRow) => row.kind !== ITEM_KIND_FOLDER);

    const savedRows = await mapConcurrent(
        upsertableRows,
        (row) =>
            prisma.libraryItem.upsert({
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
            }),
        IMPORT_UPSERT_CONCURRENCY
    );

    for (const [index, savedRow] of savedRows.entries()) {
        const row = upsertableRows[index];
        if (
            row &&
            shouldAddToSmartCollections(row) &&
            !liveKeys.has(libraryItemIdentityKey(row))
        ) {
            smartCollectionItemIds.add(savedRow.id);
        }
    }

    return {
        skippedCount,
        smartCollectionItemIds: [...smartCollectionItemIds],
        upsertedCount: upsertableRows.length,
    };
}
