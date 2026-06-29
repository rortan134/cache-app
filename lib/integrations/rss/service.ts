import "server-only";

import { ITEM_KIND_BOOKMARK } from "@/lib/common/constants";
import { getErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import { upsertLibraryItemImports } from "@/lib/integrations/upsert";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import { LibraryItemSource } from "@/prisma/client/enums";
import { RssFeedError } from "./errors";
import { parseFeed } from "./parser";

const log = createLogger("integrations:rss");

const REFRESH_MIN_INTERVAL_MS = 15 * 60 * 1000;
const TRAILING_SLASH_RE = /\/+$/;

function normalizeFeedUrl(url: string): string {
    const trimmed = url.trim();
    try {
        const parsed = new URL(trimmed);
        parsed.protocol = parsed.protocol.toLowerCase();
        parsed.hostname = parsed.hostname.toLowerCase();
        return parsed.href.replace(TRAILING_SLASH_RE, "");
    } catch {
        return trimmed.toLowerCase().replace(TRAILING_SLASH_RE, "");
    }
}

export async function addRssFeed(args: {
    feedUrl: string;
    userId: string;
}): Promise<string> {
    const feedUrl = args.feedUrl.trim();
    const urlKey = normalizeFeedUrl(feedUrl);

    const existing = await prisma.rssFeed.findUnique({
        select: { id: true },
        where: { userId_urlKey: { urlKey, userId: args.userId } },
    });

    if (existing) {
        throw new RssFeedError({
            kind: "already_exists",
            message: "You've already added this feed.",
        });
    }

    const feed = await prisma.rssFeed.create({
        data: {
            feedUrl,
            urlKey,
            userId: args.userId,
        },
    });

    log.info("Feed added", { feedId: feed.id, url: feedUrl });

    return feed.id;
}

export async function removeRssFeed(args: {
    feedId: string;
    userId: string;
}): Promise<void> {
    await prisma.rssFeed.deleteMany({
        where: { id: args.feedId, userId: args.userId },
    });

    log.info("Feed removed", { feedId: args.feedId });
}

export function listRssFeeds(args: { userId: string }) {
    return prisma.rssFeed.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            description: true,
            feedUrl: true,
            id: true,
            lastError: true,
            lastFetchedAt: true,
            siteUrl: true,
            title: true,
            updatedAt: true,
        },
        where: { userId: args.userId },
    });
}

export interface RssFeedRefreshResult {
    errors: Array<{ feedId: string; error: string }>;
    importedCount: number;
    refreshedFeedIds: string[];
    skippedFeedIds: string[];
}

export async function refreshFeedsForUser(args: {
    now: Date;
    userId: string;
}): Promise<RssFeedRefreshResult> {
    const feeds = await prisma.rssFeed.findMany({
        where: {
            OR: [
                { lastFetchedAt: null },
                {
                    lastFetchedAt: {
                        lt: new Date(
                            args.now.getTime() - REFRESH_MIN_INTERVAL_MS
                        ),
                    },
                },
            ],
            userId: args.userId,
        },
    });

    const refreshedFeedIds: string[] = [];
    const skippedFeedIds: string[] = [];
    const errors: Array<{ feedId: string; error: string }> = [];
    let importedCount = 0;

    for (const feed of feeds) {
        if (
            feed.lastFetchedAt &&
            args.now.getTime() - feed.lastFetchedAt.getTime() <
                REFRESH_MIN_INTERVAL_MS
        ) {
            skippedFeedIds.push(feed.id);
            continue;
        }

        try {
            const parsed = await parseFeed(feed.feedUrl);

            const items: Array<{
                caption: string | null;
                externalId: string;
                kind: "bookmark";
                postedAt: Date | null;
                scrapedAt: Date;
                sourceMetadata: Prisma.InputJsonObject;
                url: string;
            }> = [];

            for (const item of parsed.items) {
                const guid = item.guid ?? item.link;
                if (!guid) {
                    continue;
                }

                items.push({
                    caption: item.title ?? null,
                    externalId: guid,
                    kind: ITEM_KIND_BOOKMARK,
                    postedAt: item.isoDate ? new Date(item.isoDate) : null,
                    scrapedAt: args.now,
                    sourceMetadata: {
                        author: item.creator ?? null,
                        categories: item.categories ?? [],
                    } as Prisma.InputJsonObject,
                    url: item.link ?? "",
                });
            }

            if (items.length === 0) {
                refreshedFeedIds.push(feed.id);

                await prisma.rssFeed.update({
                    data: {
                        description: parsed.description ?? feed.description,
                        lastError: null,
                        lastFetchedAt: args.now,
                        siteUrl: parsed.link ?? feed.siteUrl,
                        title: parsed.title ?? feed.title,
                    },
                    where: { id: feed.id },
                });
                continue;
            }

            const result = await upsertLibraryItemImports({
                items,
                source: LibraryItemSource.rss_feed,
                userId: args.userId,
            });

            importedCount += result.upsertedCount;
            refreshedFeedIds.push(feed.id);

            await prisma.rssFeed.update({
                data: {
                    description: parsed.description ?? feed.description,
                    lastError: null,
                    lastFetchedAt: args.now,
                    siteUrl: parsed.link ?? feed.siteUrl,
                    title: parsed.title ?? feed.title,
                },
                where: { id: feed.id },
            });

            log.info("Feed refreshed", {
                feedId: feed.id,
                importedCount: result.upsertedCount,
            });
        } catch (error) {
            const message = getErrorMessage(error, "Failed to fetch feed.");
            errors.push({ error: message, feedId: feed.id });

            await prisma.rssFeed.update({
                data: { lastError: message },
                where: { id: feed.id },
            });

            log.error("Feed refresh failed", { error, feedId: feed.id });
        }
    }

    return {
        errors,
        importedCount,
        refreshedFeedIds,
        skippedFeedIds,
    };
}
