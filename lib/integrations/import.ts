import "server-only";

import { chunk, mapConcurrent } from "@/lib/common/array";
import { ITEM_KIND_BOOKMARK, ITEM_KIND_FOLDER } from "@/lib/common/constants";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { prisma } from "@/prisma";
import { Prisma } from "@/prisma/client/client";
import type { LibraryItemSource } from "@/prisma/client/enums";

const EXISTING_IMPORT_LOOKUP_BATCH_SIZE = 250;
const IMPORT_UPSERT_CONCURRENCY = 4;
const SNAPSHOT_IMPORT_TRANSACTION_MAX_WAIT_MS = 10_000;
const SNAPSHOT_IMPORT_TRANSACTION_TIMEOUT_MS = 60_000;
const SNAPSHOT_UPSERT_CONCURRENCY = 1;

type LibraryItemImportKind =
    | typeof ITEM_KIND_BOOKMARK
    | typeof ITEM_KIND_FOLDER;

interface LibraryItemImportIdentity {
    browserProfileId: string;
    externalId: string;
}

interface LibraryItemImportRow extends LibraryItemImportIdentity {
    caption: string | null;
    kind: LibraryItemImportKind;
    parentExternalId: string | null;
    postedAt: Date | null;
    scrapedAt: Date | null;
    source: LibraryItemSource;
    sourceDeviceId: string | null;
    sourceDeviceName: string | null;
    sourceMetadata: Prisma.InputJsonObject | null;
    url: string;
}

interface LibraryItemImportInput {
    browserProfileId?: string | null;
    caption?: string | null;
    externalId?: string | null;
    kind?: LibraryItemImportKind;
    parentExternalId?: string | null;
    postedAt?: Date | null;
    scrapedAt?: Date | null;
    sourceDeviceId?: string | null;
    sourceDeviceName?: string | null;
    sourceMetadata?: Prisma.InputJsonObject | null;
    url: string;
}

interface ExistingLibraryItemImport extends LibraryItemImportIdentity {
    deletedAt: Date | null;
}

type LibraryItemDelegate = Pick<
    Prisma.TransactionClient["libraryItem"],
    "deleteMany" | "findMany" | "upsert"
>;

interface PersistedLibraryItemImports {
    importedCount: number;
    smartCollectionItemIds: string[];
    updatedCount: number;
}

function normalizeLibraryItemImportRows(args: {
    items: LibraryItemImportInput[];
    source: LibraryItemSource;
}): { rows: LibraryItemImportRow[]; skippedCount: number } {
    const rowsByIdentity = new Map<string, LibraryItemImportRow>();
    let skippedCount = 0;

    for (const item of args.items) {
        const externalId = item.externalId?.trim();
        if (!externalId) {
            skippedCount += 1;
            continue;
        }

        const row: LibraryItemImportRow = {
            browserProfileId:
                item.browserProfileId?.trim() || DEFAULT_BROWSER_PROFILE_ID,
            caption: item.caption?.trim() || null,
            externalId,
            kind:
                item.kind === ITEM_KIND_FOLDER
                    ? ITEM_KIND_FOLDER
                    : ITEM_KIND_BOOKMARK,
            parentExternalId: item.parentExternalId ?? null,
            postedAt: item.postedAt ?? null,
            scrapedAt: item.scrapedAt ?? null,
            source: args.source,
            sourceDeviceId: item.sourceDeviceId ?? null,
            sourceDeviceName: item.sourceDeviceName ?? null,
            sourceMetadata: item.sourceMetadata ?? null,
            url: item.url,
        };

        rowsByIdentity.set(libraryItemIdentityKey(row), row);
    }

    return {
        rows: [...rowsByIdentity.values()],
        skippedCount,
    };
}

function libraryItemIdentityKey({
    browserProfileId,
    externalId,
}: LibraryItemImportIdentity): string {
    return `${browserProfileId}\u0000${externalId}`;
}

function buildLibraryItemCreateData(
    row: LibraryItemImportRow,
    userId: string
): Prisma.LibraryItemUncheckedCreateInput {
    return {
        ...row,
        sourceMetadata: row.sourceMetadata ?? Prisma.DbNull,
        userId,
    };
}

function buildLibraryItemUpdateData(
    row: LibraryItemImportRow
): Prisma.LibraryItemUncheckedUpdateInput {
    return {
        browserProfileId: row.browserProfileId,
        caption: row.caption,
        deletedAt: null,
        kind: row.kind,
        parentExternalId: row.parentExternalId,
        postedAt: row.postedAt,
        scrapedAt: row.scrapedAt,
        sourceDeviceId: row.sourceDeviceId,
        sourceDeviceName: row.sourceDeviceName,
        sourceMetadata: row.sourceMetadata ?? Prisma.DbNull,
        url: row.url,
    };
}

async function persistLibraryItemImportRows(args: {
    existingRows: ExistingLibraryItemImport[];
    libraryItemDelegate: LibraryItemDelegate;
    rows: LibraryItemImportRow[];
    shouldAddToSmartCollections?: (row: LibraryItemImportRow) => boolean;
    source: LibraryItemSource;
    upsertConcurrency: number;
    userId: string;
}): Promise<PersistedLibraryItemImports> {
    const importedKeys = new Set(args.rows.map(libraryItemIdentityKey));
    const liveKeys = new Set(
        args.existingRows
            .filter((row) => row.deletedAt === null)
            .map(libraryItemIdentityKey)
            .filter((key) => importedKeys.has(key))
    );
    const tombstonedKeys = new Set(
        args.existingRows
            .filter((row) => row.deletedAt !== null)
            .map(libraryItemIdentityKey)
            .filter((key) => importedKeys.has(key))
    );
    const upsertableRows = args.rows.filter(
        (row) => !tombstonedKeys.has(libraryItemIdentityKey(row))
    );
    const shouldAddToSmartCollections =
        args.shouldAddToSmartCollections ??
        ((row: LibraryItemImportRow) => row.kind !== ITEM_KIND_FOLDER);
    const savedRows = await mapConcurrent(
        upsertableRows,
        (row) =>
            args.libraryItemDelegate.upsert({
                create: buildLibraryItemCreateData(row, args.userId),
                select: { id: true },
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
        args.upsertConcurrency
    );
    const smartCollectionItemIds = new Set<string>();

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
        importedCount: upsertableRows.length - liveKeys.size,
        smartCollectionItemIds: [...smartCollectionItemIds],
        updatedCount: liveKeys.size,
    };
}

async function findExistingImportRows(args: {
    rows: LibraryItemImportRow[];
    source: LibraryItemSource;
    userId: string;
}): Promise<ExistingLibraryItemImport[]> {
    const batchResults = await mapConcurrent(
        chunk(args.rows, EXISTING_IMPORT_LOOKUP_BATCH_SIZE),
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
        IMPORT_UPSERT_CONCURRENCY
    );

    return batchResults.flat();
}

export async function upsertLibraryItemImports(args: {
    items: LibraryItemImportInput[];
    shouldAddToSmartCollections?: (row: LibraryItemImportRow) => boolean;
    source: LibraryItemSource;
    userId: string;
}) {
    const { rows, skippedCount } = normalizeLibraryItemImportRows(args);
    if (rows.length === 0) {
        return { skippedCount, smartCollectionItemIds: [], upsertedCount: 0 };
    }

    const result = await persistLibraryItemImportRows({
        existingRows: await findExistingImportRows({
            rows,
            source: args.source,
            userId: args.userId,
        }),
        libraryItemDelegate: prisma.libraryItem,
        rows,
        shouldAddToSmartCollections: args.shouldAddToSmartCollections,
        source: args.source,
        upsertConcurrency: IMPORT_UPSERT_CONCURRENCY,
        userId: args.userId,
    });

    return {
        skippedCount,
        smartCollectionItemIds: result.smartCollectionItemIds,
        upsertedCount: result.importedCount + result.updatedCount,
    };
}

function groupRowsByProfile(rows: LibraryItemImportRow[]) {
    const grouped = new Map<string, LibraryItemImportRow[]>();

    for (const row of rows) {
        const profileRows = grouped.get(row.browserProfileId);
        if (profileRows) {
            profileRows.push(row);
            continue;
        }
        grouped.set(row.browserProfileId, [row]);
    }

    return grouped;
}

async function importSnapshotProfileRows(args: {
    browserProfileId: string;
    libraryItemDelegate: LibraryItemDelegate;
    rows: LibraryItemImportRow[];
    snapshotComplete: boolean;
    source: LibraryItemSource;
    userId: string;
}): Promise<PersistedLibraryItemImports & { prunedCount: number }> {
    const existingRows = await args.libraryItemDelegate.findMany({
        select: {
            browserProfileId: true,
            deletedAt: true,
            externalId: true,
        },
        where: {
            browserProfileId: args.browserProfileId,
            source: args.source,
            userId: args.userId,
        },
    });

    const result = await persistLibraryItemImportRows({
        existingRows,
        libraryItemDelegate: args.libraryItemDelegate,
        rows: args.rows,
        source: args.source,
        upsertConcurrency: SNAPSHOT_UPSERT_CONCURRENCY,
        userId: args.userId,
    });

    if (!args.snapshotComplete) {
        return { ...result, prunedCount: 0 };
    }

    const retainedExternalIds = args.rows.map((row) => row.externalId);
    const { count: prunedCount } = await args.libraryItemDelegate.deleteMany({
        where: {
            browserProfileId: args.browserProfileId,
            deletedAt: null,
            ...(retainedExternalIds.length > 0
                ? { externalId: { notIn: retainedExternalIds } }
                : {}),
            source: args.source,
            userId: args.userId,
        },
    });

    return { ...result, prunedCount };
}

export async function importLibraryItemSnapshot(args: {
    browserProfileIdsToSync?: string[];
    items: LibraryItemImportInput[];
    snapshotComplete: boolean;
    source: LibraryItemSource;
    userId: string;
}) {
    const { rows, skippedCount } = normalizeLibraryItemImportRows(args);
    const rowsByProfile = groupRowsByProfile(rows);
    const browserProfileIdsToSync = new Set(
        args.browserProfileIdsToSync?.length
            ? args.browserProfileIdsToSync
            : [DEFAULT_BROWSER_PROFILE_ID]
    );

    for (const browserProfileId of rowsByProfile.keys()) {
        browserProfileIdsToSync.add(browserProfileId);
    }

    const result = {
        importedCount: 0,
        prunedCount: 0,
        smartCollectionItemIds: new Set<string>(),
        updatedCount: 0,
    };

    await prisma.$transaction(
        async (tx) => {
            for (const browserProfileId of browserProfileIdsToSync) {
                const profileResult = await importSnapshotProfileRows({
                    browserProfileId,
                    libraryItemDelegate: tx.libraryItem,
                    rows: rowsByProfile.get(browserProfileId) ?? [],
                    snapshotComplete: args.snapshotComplete,
                    source: args.source,
                    userId: args.userId,
                });
                result.importedCount += profileResult.importedCount;
                result.prunedCount += profileResult.prunedCount;
                result.updatedCount += profileResult.updatedCount;
                for (const itemId of profileResult.smartCollectionItemIds) {
                    result.smartCollectionItemIds.add(itemId);
                }
            }
        },
        {
            maxWait: SNAPSHOT_IMPORT_TRANSACTION_MAX_WAIT_MS,
            timeout: SNAPSHOT_IMPORT_TRANSACTION_TIMEOUT_MS,
        }
    );

    return {
        ...result,
        skippedCount,
        smartCollectionItemIds: [...result.smartCollectionItemIds],
    };
}
