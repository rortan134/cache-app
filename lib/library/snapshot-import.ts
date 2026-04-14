import "server-only";

import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/library/chrome-bookmarks";
import type { LibraryItemSource } from "@/prisma/client/enums";
import { prisma } from "@/prisma";

const SNAPSHOT_UPSERT_BATCH_SIZE = 50;
const SNAPSHOT_IMPORT_TRANSACTION_TIMEOUT_MS = 60_000;
const SNAPSHOT_IMPORT_TRANSACTION_MAX_WAIT_MS = 10_000;

interface SnapshotImportRow {
    readonly browserProfileId: string;
    readonly caption: string | null;
    readonly externalId: string;
    readonly kind: "bookmark" | "folder";
    readonly parentExternalId: string | null;
    readonly postedAt: Date | null;
    readonly scrapedAt: Date | null;
    readonly source: LibraryItemSource;
    readonly sourceDeviceId: string | null;
    readonly sourceDeviceName: string | null;
    readonly sourceMetadata: Record<string, unknown> | null;
    readonly thumbnailUrl: string | null;
    readonly url: string;
}

export interface SnapshotImportItemInput {
    readonly browserProfileId?: string;
    readonly caption?: string | null;
    readonly externalId?: string | null;
    readonly kind?: "bookmark" | "folder";
    readonly parentExternalId?: string | null;
    readonly postedAt?: Date | null;
    readonly scrapedAt?: Date | null;
    readonly sourceDeviceId?: string | null;
    readonly sourceDeviceName?: string | null;
    readonly sourceMetadata?: Record<string, unknown> | null;
    readonly thumbnailUrl?: string | null;
    readonly url: string;
}

export interface SnapshotImportResult {
    readonly importedCount: number;
    readonly prunedCount: number;
    readonly skippedCount: number;
    readonly smartCollectionItemIds: readonly string[];
    readonly updatedCount: number;
}

interface ExistingLibraryItem {
    readonly externalId: string;
    readonly id: string;
}

interface LibraryItemDelegate {
    deleteMany(args: {
        where: {
            browserProfileId: string;
            externalId?: { in?: string[]; notIn?: string[] };
            source: LibraryItemSource;
            userId: string;
        };
    }): Promise<{ count: number }>;
    findMany(args: {
        select: { externalId: true; id: true };
        where: {
            browserProfileId: string;
            source: LibraryItemSource;
            userId: string;
        };
    }): Promise<ExistingLibraryItem[]>;
    upsert(args: {
        create: SnapshotImportRow & { userId: string };
        select: {
            id: true;
        };
        update: Omit<SnapshotImportRow, "externalId" | "source">;
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
}

function normalizeSnapshotRow(
    source: LibraryItemSource,
    item: SnapshotImportItemInput
): SnapshotImportRow | null {
    const externalId = item.externalId?.trim();
    if (!externalId) {
        return null;
    }

    return {
        browserProfileId:
            item.browserProfileId?.trim() || DEFAULT_BROWSER_PROFILE_ID,
        caption: item.caption?.trim() || null,
        externalId,
        kind: item.kind === "folder" ? "folder" : "bookmark",
        parentExternalId: item.parentExternalId ?? null,
        postedAt: item.postedAt ?? null,
        scrapedAt: item.scrapedAt ?? null,
        source,
        sourceDeviceId: item.sourceDeviceId ?? null,
        sourceDeviceName: item.sourceDeviceName ?? null,
        sourceMetadata: item.sourceMetadata ?? null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        url: item.url,
    };
}

function groupRowsByProfile(rows: readonly SnapshotImportRow[]) {
    const grouped = new Map<string, Map<string, SnapshotImportRow>>();

    for (const row of rows) {
        const rowsByExternalId =
            grouped.get(row.browserProfileId) ??
            new Map<string, SnapshotImportRow>();
        rowsByExternalId.set(row.externalId, row);
        grouped.set(row.browserProfileId, rowsByExternalId);
    }

    return grouped;
}

function chunkRows<T>(rows: readonly T[], size: number) {
    const chunks: T[][] = [];
    for (let index = 0; index < rows.length; index += size) {
        chunks.push(rows.slice(index, index + size));
    }
    return chunks;
}

async function importSnapshotProfileRows(args: {
    readonly browserProfileId: string;
    readonly libraryItemDelegate: LibraryItemDelegate;
    readonly rows: readonly SnapshotImportRow[];
    readonly snapshotComplete: boolean;
    readonly source: LibraryItemSource;
    readonly userId: string;
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
    const smartCollectionItemIds = new Set<string>();

    for (const batch of chunkRows(args.rows, SNAPSHOT_UPSERT_BATCH_SIZE)) {
        const savedRows = await Promise.all(
            batch.map((row) =>
                args.libraryItemDelegate.upsert({
                    create: {
                        ...row,
                        userId: args.userId,
                    },
                    select: {
                        id: true,
                    },
                    update: {
                        browserProfileId: row.browserProfileId,
                        caption: row.caption,
                        kind: row.kind,
                        parentExternalId: row.parentExternalId,
                        postedAt: row.postedAt,
                        scrapedAt: row.scrapedAt,
                        sourceDeviceId: row.sourceDeviceId,
                        sourceDeviceName: row.sourceDeviceName,
                        sourceMetadata: row.sourceMetadata,
                        thumbnailUrl: row.thumbnailUrl,
                        url: row.url,
                    },
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
            smartCollectionItemIds: [...smartCollectionItemIds],
            updatedCount: args.rows.length - importedCount,
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
        smartCollectionItemIds: [...smartCollectionItemIds],
        updatedCount: args.rows.length - importedCount,
    };
}

export async function importLibraryItemSnapshot(args: {
    readonly browserProfileIdsToSync?: readonly string[];
    readonly items: readonly SnapshotImportItemInput[];
    readonly snapshotComplete: boolean;
    readonly source: LibraryItemSource;
    readonly userId: string;
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
            const libraryItemDelegate =
                tx.libraryItem as unknown as LibraryItemDelegate;

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
        smartCollectionItemIds: [...smartCollectionItemIds],
        updatedCount,
    };
}
