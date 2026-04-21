import { importLibraryItemSnapshot } from "@/lib/integrations/shared/snapshot";
import { autoTagLibraryItemsByIds } from "@/lib/smart-collections";
import { LibraryItemSource } from "@/prisma/client/enums";

export interface YoutubeWatchLaterItemInput {
    availability?: string;
    channelId?: string;
    channelName?: string;
    duration?: string;
    playlistItemId?: string;
    position?: number;
    publishedAt?: string;
    scrapedAt?: string;
    thumbnailUrl?: string;
    title?: string;
    videoId: string;
    videoUrl?: string;
}

function parseDate(value: string | undefined): Date | null {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function importYoutubeWatchLaterSnapshot(args: {
    browserProfileId?: string;
    items: YoutubeWatchLaterItemInput[];
    snapshotComplete: boolean;
    sourceDeviceId?: string;
    sourceDeviceName?: string;
    userId: string;
}) {
    const {
        browserProfileId,
        items,
        snapshotComplete,
        sourceDeviceId,
        sourceDeviceName,
        userId,
    } = args;

    const syncedAt = new Date();
    const result = await importLibraryItemSnapshot({
        browserProfileIdsToSync: [browserProfileId ?? "default"],
        items: items.map((item) => ({
            browserProfileId,
            caption: item.title ?? null,
            externalId: item.videoId,
            postedAt: parseDate(item.publishedAt),
            scrapedAt: parseDate(item.scrapedAt) ?? syncedAt,
            sourceDeviceId: sourceDeviceId ?? null,
            sourceDeviceName: sourceDeviceName ?? null,
            sourceMetadata: {
                youtube: {
                    availability: item.availability ?? null,
                    channelId: item.channelId ?? null,
                    channelName: item.channelName ?? null,
                    duration: item.duration ?? null,
                    importTimestamp: syncedAt.toISOString(),
                    isLive: item.availability === "live",
                    isUpcoming: item.availability === "upcoming",
                    playlistItemId: item.playlistItemId ?? null,
                    position: item.position ?? null,
                    videoId: item.videoId,
                },
            },
            thumbnailUrl: item.thumbnailUrl ?? null,
            url:
                item.videoUrl ??
                `https://www.youtube.com/watch?v=${encodeURIComponent(item.videoId)}`,
        })),
        snapshotComplete,
        source: LibraryItemSource.youtube_watch_later,
        userId,
    });

    const { smartCollectionItemIds, ...snapshotResult } = result;

    if (smartCollectionItemIds.length > 0) {
        autoTagLibraryItemsByIds({
            itemIds: smartCollectionItemIds,
            userId,
        }).catch(console.error);
    }

    return snapshotResult;
}
