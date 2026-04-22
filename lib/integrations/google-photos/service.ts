import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import type { Prisma } from "@/prisma/client/client";
import { LibraryItemSource } from "@/prisma/client/enums";
import type {
    GooglePhotosPickedMediaItem,
    GooglePhotosPickerSession,
} from "./api";
import { pickerPollIntervalMs, withPickerAutoclose } from "./api";

export interface PickerSessionViewModel {
    mediaItemsSet?: boolean;
    pickerUri: string | null;
    pollIntervalMs: number;
    sessionId: string;
    timeoutIn: string | null;
}

export function mapPickerSessionToViewModel(
    session: GooglePhotosPickerSession
): PickerSessionViewModel {
    return {
        mediaItemsSet: Boolean(session.mediaItemsSet),
        pickerUri: session.pickerUri
            ? withPickerAutoclose(session.pickerUri)
            : null,
        pollIntervalMs: pickerPollIntervalMs(
            session.pollingConfig?.pollInterval
        ),
        sessionId: session.id,
        timeoutIn: session.pollingConfig?.timeoutIn ?? null,
    };
}

export interface GooglePhotosImportCandidate {
    readonly caption: string | null;
    readonly externalId: string;
    readonly scrapedAt: Date | null;
    readonly sourceMetadata: Prisma.InputJsonObject;
    readonly thumbnailUrl: string | null;
    readonly url: string;
}

export function mediaUrlFromItem(
    item: GooglePhotosPickedMediaItem
): string | null {
    const baseUrl = item.mediaFile?.baseUrl;
    if (!baseUrl) {
        return null;
    }
    if (item.mediaFile?.mimeType?.startsWith("video/")) {
        return `${baseUrl}=dv`;
    }
    return `${baseUrl}=w2048-h2048`;
}

export function mediaThumbnailFromItem(
    item: GooglePhotosPickedMediaItem
): string | null {
    const baseUrl = item.mediaFile?.baseUrl;
    if (!baseUrl) {
        return null;
    }
    return `${baseUrl}=w640-h640-c`;
}

export function googlePhotosSourceMetadata(
    item: GooglePhotosPickedMediaItem
): Prisma.InputJsonObject {
    return {
        googlePhotos: {
            filename: item.mediaFile?.filename ?? null,
            mimeType: item.mediaFile?.mimeType ?? null,
        },
    };
}

export function buildGooglePhotosImportCandidate(
    item: GooglePhotosPickedMediaItem
): GooglePhotosImportCandidate | null {
    const url = mediaUrlFromItem(item);
    if (!url) {
        return null;
    }

    return {
        caption: item.mediaFile?.filename ?? null,
        externalId: item.id,
        scrapedAt: item.createTime ? new Date(item.createTime) : null,
        sourceMetadata: googlePhotosSourceMetadata(item),
        thumbnailUrl: mediaThumbnailFromItem(item),
        url,
    };
}

export function collectGooglePhotosImportCandidates(
    items: GooglePhotosPickedMediaItem[]
): {
    candidates: GooglePhotosImportCandidate[];
    skippedCount: number;
} {
    const candidates: GooglePhotosImportCandidate[] = [];
    let skippedCount = 0;

    for (const item of items) {
        const candidate = buildGooglePhotosImportCandidate(item);
        if (!candidate) {
            skippedCount += 1;
            continue;
        }

        candidates.push(candidate);
    }

    return {
        candidates,
        skippedCount,
    };
}

export async function importGooglePhotosCandidates(args: {
    readonly candidates: GooglePhotosImportCandidate[];
    readonly userId: string;
}): Promise<{
    importedCount: number;
    smartCollectionItemIds: string[];
}> {
    const result = await upsertLibraryItemImports({
        items: args.candidates.map((candidate) => ({
            browserProfileId: DEFAULT_BROWSER_PROFILE_ID,
            caption: candidate.caption,
            externalId: candidate.externalId,
            scrapedAt: candidate.scrapedAt,
            sourceMetadata: candidate.sourceMetadata,
            thumbnailUrl: candidate.thumbnailUrl,
            url: candidate.url,
        })),
        source: LibraryItemSource.google_photos,
        userId: args.userId,
    });

    return {
        importedCount: result.upsertedCount,
        smartCollectionItemIds: result.smartCollectionItemIds,
    };
}
