import { DEFAULT_BROWSER_PROFILE_ID } from "@/lib/integrations/browser-profiles";
import { parseOptionalDate } from "@/lib/integrations/dates";
import { importLibraryItemSnapshot } from "@/lib/integrations/snapshot";
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
        browserProfileIdsToSync: [
            browserProfileId ?? DEFAULT_BROWSER_PROFILE_ID,
        ],
        items: items.map((item) => ({
            browserProfileId,
            caption: item.title ?? null,
            externalId: item.videoId,
            postedAt: parseOptionalDate(item.publishedAt),
            scrapedAt: parseOptionalDate(item.scrapedAt) ?? syncedAt,
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

    return {
        ...result,
        smartCollectionItemIds: result.smartCollectionItemIds,
    };
}
