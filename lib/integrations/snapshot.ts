import "server-only";

import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import {
    buildLibraryItemCreateData,
    buildLibraryItemImportRow,
    buildLibraryItemUpdateData,
    type LibraryItemImportRow,
} from "@/lib/integrations/library-item-imports";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import type { LibraryItemSource } from "@/prisma/client/enums";

const SNAPSHOT_UPSERT_BATCH_SIZE = 50;
const SNAPSHOT_IMPORT_TRANSACTION_TIMEOUT_MS = 60_000;
const SNAPSHOT_IMPORT_TRANSACTION_MAX_WAIT_MS = 10_000;

type SnapshotImportRow = LibraryItemImportRow;

export interface SnapshotImportItemInput {
    browserProfileId?: string;
    caption?: string | null;
    externalId?: string | null;
    kind?: "bookmark" | "folder";
    parentExternalId?: string | null;
    postedAt?: Date | null;
    scrapedAt?: Date | null;
    sourceDeviceId?: string | null;
    sourceDeviceName?: string | null;
    sourceMetadata?: Prisma.InputJsonObject | null;
    thumbnailUrl?: string | null;
    url: string;
}

export interface SnapshotImportResult {
    importedCount: number;
    prunedCount: number;
    skippedCount: number;
    smartCollectionItemIds: string[];
    updatedCount: number;
}

type LibraryItemDelegate = Pick<
    Prisma.TransactionClient["libraryItem"],
    "deleteMany" | "findMany" | "upsert"
>;

function normalizeSnapshotRow(
    source: LibraryItemSource,
    item: SnapshotImportItemInput
): SnapshotImportRow | null {
    return buildLibraryItemImportRow({
        browserProfileId: item.browserProfileId,
        caption: item.caption,
        externalId: item.externalId,
        kind: item.kind,
        parentExternalId: item.parentExternalId,
        postedAt: item.postedAt,
        scrapedAt: item.scrapedAt,
        source,
        sourceDeviceId: item.sourceDeviceId,
        sourceDeviceName: item.sourceDeviceName,
        sourceMetadata: item.sourceMetadata,
        thumbnailUrl: item.thumbnailUrl,
        url: item.url,
    });
}

function groupRowsByProfile(rows: SnapshotImportRow[]) {
    const grouped = new Map<string, Map<string, SnapshotImportRow>>();

    for (const row of rows) {
        const rowsByExternalId = grouped.get(row.browserProfileId);
        if (rowsByExternalId) {
            rowsByExternalId.set(row.externalId, row);
            continue;
        }

        const rowsForProfile = new Map<string, SnapshotImportRow>();
        rowsForProfile.set(row.externalId, row);
        grouped.set(row.browserProfileId, rowsForProfile);
    }

    return grouped;
}

function chunkRows<T>(rows: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < rows.length; index += size) {
        chunks.push(rows.slice(index, index + size));
    }
    return chunks;
}

async function importSnapshotProfileRows(args: {
    browserProfileId: string;
    libraryItemDelegate: LibraryItemDelegate;
    rows: SnapshotImportRow[];
    snapshotComplete: boolean;
    source: LibraryItemSource;
    userId: string;
}): Promise<{
    importedCount: number;
    prunedCount: number;
    smartCollectionItemIds: string[];
    updatedCount: number;
}> {
    const existingRows = await args.libraryItemDelegate.findMany({
        select: { externalId: true, id: true },
        where: {
            browserProfileId: args.browserProfileId,
            source: args.source,
            userId: args.userId,
        },
    });
    const existingExternalIds = new Set(
        existingRows.map((row) => row.externalId)
    );
    const importedCount = args.rows.filter(
        (row) => !existingExternalIds.has(row.externalId)
    ).length;
    const updatedCount = args.rows.length - importedCount;
    const smartCollectionItemIds = new Set<string>();

    for (const batch of chunkRows(args.rows, SNAPSHOT_UPSERT_BATCH_SIZE)) {
        const savedRows = await Promise.all(
            batch.map((row) =>
                args.libraryItemDelegate.upsert({
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
                })
            )
        );

        for (const [index, savedRow] of savedRows.entries()) {
            const sourceRow = batch[index];
            if (
                sourceRow &&
                sourceRow.kind !== "folder" &&
                !existingExternalIds.has(sourceRow.externalId)
            ) {
                smartCollectionItemIds.add(savedRow.id);
            }
        }
    }

    if (!args.snapshotComplete) {
        return {
            importedCount,
            prunedCount: 0,
            smartCollectionItemIds: Array.from(smartCollectionItemIds),
            updatedCount,
        };
    }

    const retainedExternalIds = args.rows.map((row) => row.externalId);
    const deleteResult = await args.libraryItemDelegate.deleteMany({
        where: {
            browserProfileId: args.browserProfileId,
            ...(retainedExternalIds.length > 0
                ? {
                      externalId: {
                          notIn: retainedExternalIds,
                      },
                  }
                : {}),
            source: args.source,
            userId: args.userId,
        },
    });

    return {
        importedCount,
        prunedCount: deleteResult.count,
        smartCollectionItemIds: Array.from(smartCollectionItemIds),
        updatedCount,
    };
}

export async function importLibraryItemSnapshot(args: {
    browserProfileIdsToSync?: string[];
    items: SnapshotImportItemInput[];
    snapshotComplete: boolean;
    source: LibraryItemSource;
    userId: string;
}): Promise<SnapshotImportResult> {
    const normalizedRows = args.items
        .map((item) => normalizeSnapshotRow(args.source, item))
        .filter((item): item is SnapshotImportRow => item !== null);
    const skippedCount = args.items.length - normalizedRows.length;
    const rowsByProfile = groupRowsByProfile(normalizedRows);
    const browserProfileIdsToSync = new Set(
        args.browserProfileIdsToSync?.length
            ? args.browserProfileIdsToSync
            : [DEFAULT_BROWSER_PROFILE_ID]
    );
    for (const browserProfileId of rowsByProfile.keys()) {
        browserProfileIdsToSync.add(browserProfileId);
    }

    let importedCount = 0;
    let updatedCount = 0;
    let prunedCount = 0;
    const smartCollectionItemIds = new Set<string>();

    await prisma.$transaction(
        async (tx) => {
            const libraryItemDelegate: LibraryItemDelegate = tx.libraryItem;

            for (const browserProfileId of browserProfileIdsToSync) {
                const rows = [
                    ...(rowsByProfile.get(browserProfileId)?.values() ?? []),
                ];
                const profileResult = await importSnapshotProfileRows({
                    browserProfileId,
                    libraryItemDelegate,
                    rows,
                    snapshotComplete: args.snapshotComplete,
                    source: args.source,
                    userId: args.userId,
                });
                importedCount += profileResult.importedCount;
                prunedCount += profileResult.prunedCount;
                updatedCount += profileResult.updatedCount;
                for (const itemId of profileResult.smartCollectionItemIds) {
                    smartCollectionItemIds.add(itemId);
                }
            }
        },
        {
            maxWait: SNAPSHOT_IMPORT_TRANSACTION_MAX_WAIT_MS,
            timeout: SNAPSHOT_IMPORT_TRANSACTION_TIMEOUT_MS,
        }
    );

    return {
        importedCount,
        prunedCount,
        skippedCount,
        smartCollectionItemIds: Array.from(smartCollectionItemIds),
        updatedCount,
    };
}
