import "server-only";

import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/chrome/service";
import type { LibraryItemSource } from "@/prisma/client/enums";

export type LibraryItemImportKind = "bookmark" | "folder";

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
    sourceMetadata: Record<string, unknown> | null;
    thumbnailUrl: string | null;
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
    sourceMetadata?: Record<string, unknown> | null;
    thumbnailUrl?: string | null;
    url: string;
}

export type LibraryItemImportCreateData = LibraryItemImportRow & {
    userId: string;
};

export interface LibraryItemImportUpdateData {
    browserProfileId: string;
    caption: string | null;
    kind: LibraryItemImportKind;
    parentExternalId: string | null;
    postedAt: Date | null;
    scrapedAt: Date | null;
    sourceDeviceId: string | null;
    sourceDeviceName: string | null;
    sourceMetadata: Record<string, unknown> | null;
    thumbnailUrl: string | null;
    url: string;
}

function normalizeOptionalTrimmedText(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
}

export function normalizeBrowserProfileId(
    browserProfileId?: string | null
): string {
    return browserProfileId?.trim() || DEFAULT_BROWSER_PROFILE_ID;
}

export function parseOptionalDate(value: string | undefined): Date | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
        kind: input.kind === "folder" ? "folder" : "bookmark",
        parentExternalId: input.parentExternalId ?? null,
        postedAt: input.postedAt ?? null,
        scrapedAt: input.scrapedAt ?? null,
        source: input.source,
        sourceDeviceId: input.sourceDeviceId ?? null,
        sourceDeviceName: input.sourceDeviceName ?? null,
        sourceMetadata: input.sourceMetadata ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        url: input.url,
    };
}

export function buildLibraryItemCreateData(
    row: LibraryItemImportRow,
    userId: string
): LibraryItemImportCreateData {
    return {
        ...row,
        userId,
    };
}

export function buildLibraryItemUpdateData(
    row: LibraryItemImportRow
): LibraryItemImportUpdateData {
    return {
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
    };
}

export function libraryItemIdentityKey({
    browserProfileId,
    externalId,
}: LibraryItemImportIdentity): string {
    return `${browserProfileId}\u0000${externalId}`;
}
