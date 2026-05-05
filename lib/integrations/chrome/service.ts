import "server-only";

import {
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { chunk } from "@/lib/common/arrays";
import { ITEM_KIND_BOOKMARK, ITEM_KIND_FOLDER } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { parseOptionalDate } from "@/lib/integrations/dates";
import { prisma } from "@/prisma";
import type { LibraryItem, Prisma } from "@/prisma/client/client";
import { type LibraryItemKind, LibraryItemSource } from "@/prisma/client/enums";
import * as z from "zod";

const log = createLogger("library:chrome-bookmarks");
const CHROME_FOLDER_URL_PREFIX = "cache://chrome-bookmarks/folder/";
const CHROME_BOOKMARK_SYNC_BATCH_SIZE = 25;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const chromeBookmarkNodeSchema = z.object({
    dateAdded: z.number().int().nonnegative().optional(),
    dateGroupModified: z.number().int().nonnegative().optional(),
    externalId: z.string().min(1),
    index: z.number().int().nonnegative().optional(),
    kind: z.enum([ITEM_KIND_BOOKMARK, ITEM_KIND_FOLDER]),
    parentExternalId: z.string().min(1).optional(),
    title: z.string().optional(),
    url: z.url().optional(),
});

const chromeBookmarkEventSchema = z
    .object({
        bookmark: chromeBookmarkNodeSchema.optional(),
        externalId: z.string().min(1).optional(),
        occurredAt: z.string().optional(),
        snapshotExternalIds: z.array(z.string().min(1)).optional(),
        type: z.enum(["delete", "import_complete", "move", "upsert"]),
    })
    .superRefine((value, ctx) => {
        if (
            (value.type === "upsert" || value.type === "move") &&
            !value.bookmark
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "bookmark is required for upsert and move events",
                path: ["bookmark"],
            });
        }
        if (value.type === "delete" && !value.externalId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "externalId is required for delete events",
                path: ["externalId"],
            });
        }
        if (
            value.type === "import_complete" &&
            (!value.snapshotExternalIds ||
                value.snapshotExternalIds.length === 0)
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    "snapshotExternalIds is required for import_complete events",
                path: ["snapshotExternalIds"],
            });
        }
    });

export const chromeBookmarkSyncBodySchema = z.object({
    browserProfileId: z.string().min(1).default(DEFAULT_BROWSER_PROFILE_ID),
    device: z
        .object({
            id: z.string().min(1),
            name: z.string().optional(),
            os: z.string().optional(),
        })
        .optional(),
    events: z.array(chromeBookmarkEventSchema).min(1),
    mode: z
        .enum(["continuous_sync", "one_time_import"])
        .default("continuous_sync"),
    syncedAt: z.string().optional(),
});

export type ChromeBookmarkSyncBody = z.infer<
    typeof chromeBookmarkSyncBodySchema
>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChromeItemKind = typeof ITEM_KIND_BOOKMARK | typeof ITEM_KIND_FOLDER;

interface ChromeBookmarkRecord {
    browserProfileId: string;
    caption: string | null;
    externalId: string;
    kind: ChromeItemKind;
    parentExternalId: string | null;
    postedAt: Date | null;
    scrapedAt: Date;
    source: typeof LibraryItemSource.chrome_bookmarks;
    sourceDeviceId: string | null;
    sourceDeviceName: string | null;
    sourceMetadata: Prisma.InputJsonObject;
    url: string;
}

type ChromeLibraryRow = LibraryItem;

interface ChromeBatchLookupState {
    aliasToPrimaryId: Map<string, string>;
    duplicateToPrimaryId: Map<string, string>;
    rowsById: Map<string, ChromeLibraryRow>;
    rowsByPrimaryExternalId: Map<string, ChromeLibraryRow>;
}

interface ChromeSyncResult {
    deduped: number;
    deleted: number;
    processed: number;
    pruned: number;
    smartCollectionItemIds: string[];
    upserted: number;
}

interface ChromeSyncAccumulator {
    deduped: number;
    deleted: number;
    processed: number;
    pruned: number;
    smartCollectionItemIds: string[];
    upserted: number;
}

type ChromeLibraryItemDelegate = Prisma.TransactionClient["libraryItem"];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeChromeCaption(value: string | null | undefined): string {
    return (value ?? "")
        .trim()
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ");
}

function chromeDuplicateKey(
    kind: LibraryItemKind,
    url: string,
    caption: string | null
): string | null {
    if (kind !== ITEM_KIND_BOOKMARK) {
        return null;
    }
    return `${url}\u0000${normalizeChromeCaption(caption)}`;
}

function chromeFolderUrl(browserProfileId: string, externalId: string): string {
    return `${CHROME_FOLDER_URL_PREFIX}${encodeURIComponent(browserProfileId)}/${encodeURIComponent(externalId)}`;
}

function normalizeChromeBookmarkRecord(
    browserProfileId: string,
    bookmark: z.infer<typeof chromeBookmarkNodeSchema>,
    occurredAt: string | undefined,
    device: ChromeBookmarkSyncBody["device"]
): ChromeBookmarkRecord {
    const title = bookmark.title?.trim();
    const metadata = {
        chrome: {
            dateAdded: bookmark.dateAdded ?? null,
            dateGroupModified: bookmark.dateGroupModified ?? null,
            index: bookmark.index ?? null,
        },
        device: device
            ? {
                  id: device.id,
                  name: device.name ?? null,
                  os: device.os ?? null,
              }
            : null,
    };

    return {
        browserProfileId,
        caption: title && title.length > 0 ? title : null,
        externalId: bookmark.externalId,
        kind:
            bookmark.kind === ITEM_KIND_FOLDER
                ? ITEM_KIND_FOLDER
                : ITEM_KIND_BOOKMARK,
        parentExternalId: bookmark.parentExternalId ?? null,
        postedAt:
            typeof bookmark.dateAdded === "number"
                ? new Date(bookmark.dateAdded)
                : null,
        scrapedAt: parseOptionalDate(occurredAt) ?? new Date(),
        source: LibraryItemSource.chrome_bookmarks,
        sourceDeviceId: device?.id ?? null,
        sourceDeviceName: device?.name ?? null,
        sourceMetadata: metadata,
        url:
            bookmark.kind === ITEM_KIND_FOLDER
                ? chromeFolderUrl(browserProfileId, bookmark.externalId)
                : (bookmark.url ??
                  chromeFolderUrl(browserProfileId, bookmark.externalId)),
    };
}

function findChromeByAlias(
    delegate: ChromeLibraryItemDelegate,
    userId: string,
    browserProfileId: string,
    externalId: string
) {
    return delegate.findFirst({
        where: {
            browserProfileId,
            source: LibraryItemSource.chrome_bookmarks,
            sourceAliasIds: {
                has: externalId,
            },
            userId,
        },
    });
}

function promoteAliasToPrimary(
    delegate: ChromeLibraryItemDelegate,
    row: Awaited<ReturnType<typeof findChromeByAlias>>,
    externalId: string
) {
    if (!row) {
        return null;
    }

    const aliasIds = new Set(row.sourceAliasIds);
    aliasIds.delete(externalId);
    aliasIds.add(row.externalId);

    return delegate.update({
        data: {
            externalId,
            sourceAliasIds: [...aliasIds],
        },
        where: { id: row.id },
    });
}

function removeChromeLookupRow(
    state: ChromeBatchLookupState,
    row: ChromeLibraryRow
): void {
    state.rowsById.delete(row.id);
    state.rowsByPrimaryExternalId.delete(row.externalId);

    for (const aliasId of row.sourceAliasIds) {
        state.aliasToPrimaryId.delete(aliasId);
    }

    const duplicateKey = chromeDuplicateKey(row.kind, row.url, row.caption);
    if (duplicateKey) {
        state.duplicateToPrimaryId.delete(duplicateKey);
    }
}

function upsertChromeLookupRow(
    state: ChromeBatchLookupState,
    row: ChromeLibraryRow
): void {
    state.rowsById.set(row.id, row);
    state.rowsByPrimaryExternalId.set(row.externalId, row);

    for (const aliasId of row.sourceAliasIds) {
        state.aliasToPrimaryId.set(aliasId, row.id);
    }

    const duplicateKey = chromeDuplicateKey(row.kind, row.url, row.caption);
    if (duplicateKey && !state.duplicateToPrimaryId.has(duplicateKey)) {
        state.duplicateToPrimaryId.set(duplicateKey, row.id);
    }
}

function buildChromeLookupState(rows: ChromeLibraryRow[]) {
    const state: ChromeBatchLookupState = {
        aliasToPrimaryId: new Map(),
        duplicateToPrimaryId: new Map(),
        rowsById: new Map(),
        rowsByPrimaryExternalId: new Map(),
    };

    for (const row of rows) {
        upsertChromeLookupRow(state, row);
    }

    return state;
}

function replaceChromeLookupRow(
    state: ChromeBatchLookupState,
    previous: ChromeLibraryRow,
    next: ChromeLibraryRow
): void {
    removeChromeLookupRow(state, previous);
    upsertChromeLookupRow(state, next);
}

async function handleChromeDeleteEvent(args: {
    delegate: ChromeLibraryItemDelegate;
    externalId: string;
    lookup: ChromeBatchLookupState;
}): Promise<boolean> {
    const exact = args.lookup.rowsByPrimaryExternalId.get(args.externalId);
    if (exact) {
        if (exact.sourceAliasIds.length > 0) {
            const [nextPrimary, ...remainingAliases] = exact.sourceAliasIds;
            const updated = await args.delegate.update({
                data: {
                    externalId: nextPrimary,
                    sourceAliasIds: remainingAliases,
                },
                where: { id: exact.id },
            });
            replaceChromeLookupRow(args.lookup, exact, updated);
        } else {
            await args.delegate.delete({
                where: { id: exact.id },
            });
            removeChromeLookupRow(args.lookup, exact);
        }
        return true;
    }

    const aliasOwnerId = args.lookup.aliasToPrimaryId.get(args.externalId);
    const aliasOwner = aliasOwnerId
        ? args.lookup.rowsById.get(aliasOwnerId)
        : null;
    if (!aliasOwner) {
        return false;
    }

    const updated = await args.delegate.update({
        data: {
            sourceAliasIds: aliasOwner.sourceAliasIds.filter(
                (value) => value !== args.externalId
            ),
        },
        where: { id: aliasOwner.id },
    });
    replaceChromeLookupRow(args.lookup, aliasOwner, updated);
    return true;
}

async function handleChromeBookmarkWriteEvent(args: {
    bookmark: z.infer<typeof chromeBookmarkNodeSchema>;
    browserProfileId: string;
    delegate: ChromeLibraryItemDelegate;
    device: ChromeBookmarkSyncBody["device"];
    lookup: ChromeBatchLookupState;
    occurredAt: string | undefined;
    userId: string;
}): Promise<{
    deduped: boolean;
    smartCollectionItemId?: string;
}> {
    const record = normalizeChromeBookmarkRecord(
        args.browserProfileId,
        args.bookmark,
        args.occurredAt,
        args.device
    );
    const exact = args.lookup.rowsByPrimaryExternalId.get(record.externalId);
    if (exact) {
        const updated = await args.delegate.update({
            data: {
                caption: record.caption,
                kind: record.kind,
                parentExternalId: record.parentExternalId,
                postedAt: record.postedAt,
                scrapedAt: record.scrapedAt,
                sourceDeviceId: record.sourceDeviceId,
                sourceDeviceName: record.sourceDeviceName,
                sourceMetadata: record.sourceMetadata,
                url: record.url,
            },
            where: { id: exact.id },
        });
        replaceChromeLookupRow(args.lookup, exact, updated);
        return { deduped: false };
    }

    const aliasOwnerId = args.lookup.aliasToPrimaryId.get(record.externalId);
    const aliasOwner = aliasOwnerId
        ? args.lookup.rowsById.get(aliasOwnerId)
        : null;
    if (aliasOwner) {
        const promoted = await promoteAliasToPrimary(
            args.delegate,
            aliasOwner,
            record.externalId
        );
        if (promoted) {
            const updated = await args.delegate.update({
                data: {
                    caption: record.caption,
                    kind: record.kind,
                    parentExternalId: record.parentExternalId,
                    postedAt: record.postedAt,
                    scrapedAt: record.scrapedAt,
                    sourceDeviceId: record.sourceDeviceId,
                    sourceDeviceName: record.sourceDeviceName,
                    sourceMetadata: record.sourceMetadata,
                    url: record.url,
                },
                where: { id: promoted.id },
            });
            replaceChromeLookupRow(args.lookup, aliasOwner, updated);
        }
        return { deduped: false };
    }

    const duplicateKey = chromeDuplicateKey(
        record.kind,
        record.url,
        record.caption
    );
    const duplicateId = duplicateKey
        ? args.lookup.duplicateToPrimaryId.get(duplicateKey)
        : null;
    const duplicate = duplicateId
        ? args.lookup.rowsById.get(duplicateId)
        : null;
    if (duplicate) {
        const aliasIds = new Set(duplicate.sourceAliasIds);
        if (duplicate.externalId !== record.externalId) {
            aliasIds.add(record.externalId);
        }
        const updated = await args.delegate.update({
            data: {
                caption: record.caption,
                parentExternalId: record.parentExternalId,
                postedAt: record.postedAt,
                scrapedAt: record.scrapedAt,
                sourceAliasIds: [...aliasIds],
                sourceDeviceId: record.sourceDeviceId,
                sourceDeviceName: record.sourceDeviceName,
                sourceMetadata: record.sourceMetadata,
                url: record.url,
            },
            where: { id: duplicate.id },
        });
        replaceChromeLookupRow(args.lookup, duplicate, updated);
        return { deduped: true };
    }

    const created = await args.delegate.create({
        data: {
            ...record,
            user: {
                connect: { id: args.userId },
            },
        },
    });
    upsertChromeLookupRow(args.lookup, created);
    return {
        deduped: false,
        smartCollectionItemId:
            created.kind === ITEM_KIND_BOOKMARK ? created.id : undefined,
    };
}

async function pruneChromeSnapshot(
    delegate: ChromeLibraryItemDelegate,
    userId: string,
    browserProfileId: string,
    snapshotExternalIds: string[]
): Promise<number> {
    const seen = new Set(snapshotExternalIds);
    const rows = await delegate.findMany({
        select: {
            externalId: true,
            id: true,
            sourceAliasIds: true,
        },
        where: {
            browserProfileId,
            source: LibraryItemSource.chrome_bookmarks,
            userId,
        },
    });

    let pruned = 0;
    for (const row of rows) {
        if (seen.has(row.externalId)) {
            continue;
        }

        const aliasCandidate = row.sourceAliasIds.find((aliasId) =>
            seen.has(aliasId)
        );
        if (aliasCandidate) {
            await delegate.update({
                data: {
                    externalId: aliasCandidate,
                    sourceAliasIds: [
                        row.externalId,
                        ...row.sourceAliasIds.filter(
                            (aliasId) => aliasId !== aliasCandidate
                        ),
                    ],
                },
                where: { id: row.id },
            });
            continue;
        }

        await delegate.delete({
            where: { id: row.id },
        });
        pruned += 1;
    }

    return pruned;
}

async function processChromeBookmarkEventBatch(args: {
    browserProfileId: string;
    device: ChromeBookmarkSyncBody["device"];
    events: ChromeBookmarkSyncBody["events"][number][];
    userId: string;
}): Promise<Omit<ChromeSyncResult, "processed" | "pruned">> {
    const delegate = prisma.libraryItem;
    const existingRows = await delegate.findMany({
        where: {
            browserProfileId: args.browserProfileId,
            source: LibraryItemSource.chrome_bookmarks,
            userId: args.userId,
        },
    });
    const lookup = buildChromeLookupState(existingRows);
    let deleted = 0;
    let deduped = 0;
    const smartCollectionItemIds = new Set<string>();
    let upserted = 0;

    for (const event of args.events) {
        if (event.type === "delete") {
            if (
                await handleChromeDeleteEvent({
                    delegate,
                    externalId: event.externalId ?? "",
                    lookup,
                })
            ) {
                deleted += 1;
            }
            continue;
        }

        const bookmark = event.bookmark;
        if (!bookmark) {
            continue;
        }

        const result = await handleChromeBookmarkWriteEvent({
            bookmark,
            browserProfileId: args.browserProfileId,
            delegate,
            device: args.device,
            lookup,
            occurredAt: event.occurredAt,
            userId: args.userId,
        });

        upserted += 1;
        if (result.deduped) {
            deduped += 1;
        }
        if (result.smartCollectionItemId) {
            smartCollectionItemIds.add(result.smartCollectionItemId);
        }
    }

    return {
        deduped,
        deleted,
        smartCollectionItemIds: [...smartCollectionItemIds],
        upserted,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function applyChromeBookmarkSyncEvents(
    userId: string,
    body: ChromeBookmarkSyncBody
): Promise<ChromeSyncResult> {
    const browserProfileId =
        body.browserProfileId || DEFAULT_BROWSER_PROFILE_ID;

    return (async () => {
        const accumulator: ChromeSyncAccumulator = {
            deduped: 0,
            deleted: 0,
            processed: body.events.length,
            pruned: 0,
            smartCollectionItemIds: [],
            upserted: 0,
        };

        const snapshotEvents = body.events.filter(
            (event) => event.type === "import_complete"
        );
        const mutationEvents = body.events.filter(
            (event) => event.type !== "import_complete"
        );

        for (const batch of chunk(
            mutationEvents,
            CHROME_BOOKMARK_SYNC_BATCH_SIZE
        )) {
            const result = await processChromeBookmarkEventBatch({
                browserProfileId,
                device: body.device,
                events: batch,
                userId,
            });
            accumulator.deduped += result.deduped;
            accumulator.deleted += result.deleted;
            accumulator.smartCollectionItemIds.push(
                ...result.smartCollectionItemIds
            );
            accumulator.upserted += result.upserted;
        }

        for (const event of snapshotEvents) {
            accumulator.pruned += await pruneChromeSnapshot(
                prisma.libraryItem,
                userId,
                browserProfileId,
                event.snapshotExternalIds ?? []
            );
        }

        return {
            ...accumulator,
            smartCollectionItemIds: [
                ...new Set(accumulator.smartCollectionItemIds),
            ],
        };
    })();
}

export async function purgeChromeBookmarksForUser(
    userId: string
): Promise<number> {
    const result = await prisma.libraryItem.deleteMany({
        where: {
            source: LibraryItemSource.chrome_bookmarks,
            userId,
        },
    });

    log.info("Purged Chrome bookmarks", {
        count: result.count,
        userId,
    });

    return result.count;
}

export async function getChromeBookmarkItemForUserByExternalId(
    userId: string,
    externalId: string
): Promise<LibraryItemWithCollections | null> {
    return (await prisma.libraryItem.findFirst({
        include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
        where: {
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            OR: [
                {
                    externalId,
                },
                {
                    sourceAliasIds: {
                        has: externalId,
                    },
                },
            ],
            source: LibraryItemSource.chrome_bookmarks,
            userId,
        },
    })) as LibraryItemWithCollections | null;
}
