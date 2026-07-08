import "server-only";

import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { ITEM_KIND_BOOKMARK, ITEM_KIND_FOLDER } from "@/lib/common/constants";
import { Prisma } from "@/prisma/client/client";
import type { LibraryItemSource } from "@/prisma/client/enums";

export type LibraryItemImportKind =
    | typeof ITEM_KIND_BOOKMARK
    | typeof ITEM_KIND_FOLDER;

export interface LibraryItemImportIdentity {
    browserProfileId: string;
    externalId: string;
}

export interface LibraryItemImportRow extends LibraryItemImportIdentity {
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

export interface LibraryItemImportRowInput {
    browserProfileId?: string | null;
    caption?: string | null;
    externalId?: string | null;
    kind?: LibraryItemImportKind;
    parentExternalId?: string | null;
    postedAt?: Date | null;
    scrapedAt?: Date | null;
    source: LibraryItemSource;
    sourceDeviceId?: string | null;
    sourceDeviceName?: string | null;
    sourceMetadata?: Prisma.InputJsonObject | null;
    url: string;
}

function normalizeOptionalTrimmedText(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
}

function normalizeBrowserProfileId(browserProfileId?: string | null): string {
    return browserProfileId?.trim() || DEFAULT_BROWSER_PROFILE_ID;
}

export function buildLibraryItemImportRow(
    input: LibraryItemImportRowInput
): LibraryItemImportRow | null {
    const externalId = normalizeOptionalTrimmedText(input.externalId);
    if (!externalId) {
        return null;
    }

    return {
        browserProfileId: normalizeBrowserProfileId(input.browserProfileId),
        caption: normalizeOptionalTrimmedText(input.caption),
        externalId,
        kind:
            input.kind === ITEM_KIND_FOLDER
                ? ITEM_KIND_FOLDER
                : ITEM_KIND_BOOKMARK,
        parentExternalId: input.parentExternalId ?? null,
        postedAt: input.postedAt ?? null,
        scrapedAt: input.scrapedAt ?? null,
        source: input.source,
        sourceDeviceId: input.sourceDeviceId ?? null,
        sourceDeviceName: input.sourceDeviceName ?? null,
        sourceMetadata: input.sourceMetadata ?? null,
        url: input.url,
    };
}

export function buildLibraryItemCreateData(
    row: LibraryItemImportRow,
    userId: string
): Prisma.LibraryItemUncheckedCreateInput {
    return {
        ...row,
        sourceMetadata: row.sourceMetadata ?? Prisma.DbNull,
        userId,
    };
}

export function buildLibraryItemUpdateData(
    row: LibraryItemImportRow
): Prisma.LibraryItemUncheckedUpdateInput {
    return {
        browserProfileId: row.browserProfileId,
        caption: row.caption,
        // An upstream re-add of a tombstoned row un-trashes it: the user's
        // sync still carries the item, so the tombstone is stale.
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

export function libraryItemIdentityKey({
    browserProfileId,
    externalId,
}: LibraryItemImportIdentity): string {
    return `${browserProfileId}\u0000${externalId}`;
}
