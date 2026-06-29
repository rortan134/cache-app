import { RssFeedError } from "./errors";
import Parser from "rss-parser";

const parser = new Parser();

export interface ParsedFeed {
    description?: string;
    items: ParsedFeedItem[];
    link?: string;
    title?: string;
}

export interface ParsedFeedItem {
    categories?: string[];
    creator?: string;
    guid?: string;
    isoDate?: string;
    link?: string;
    title?: string;
}

const FETCH_TIMEOUT_MS = 15_000;

export async function parseFeed(url: string): Promise<ParsedFeed> {
    let response: Response;
    let xml: string;

    try {
        response = await fetch(url, {
            headers: {
                "User-Agent": "Cache/1.0 RSS",
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            throw new RssFeedError({
                kind: "fetch_failed",
                message: `Feed returned HTTP ${response.status}`,
            });
        }

        xml = await response.text();
    } catch (error) {
        if (error instanceof RssFeedError) {
            throw error;
        }
        throw new RssFeedError({
            kind: "fetch_failed",
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch the feed.",
        });
    }

    let feed: Parser.Output<Record<string, unknown>>;

    try {
        feed = await parser.parseString(xml);
    } catch (error) {
        throw new RssFeedError({
            kind: "parse_failed",
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to parse the feed XML.",
        });
    }

    return {
        description: feed.description,
        items: (feed.items ?? []).map((item) => ({
            categories: item.categories,
            creator: item.creator,
            guid: item.guid ?? item.link,
            isoDate: item.isoDate ?? item.pubDate,
            link: item.link,
            title: item.title,
        })),
        link: feed.link,
        title: feed.title,
    };
}
