import "server-only";
import { XApiError } from "./error";

const X_API_BASE_URL = "https://api.x.com/2";
const X_BOOKMARKS_PAGE_SIZE = 100;
const MAX_BOOKMARK_PAGES = 100;

type JsonRecord = Record<string, unknown>;

interface XApiListResponse {
    readonly data: unknown[];
    readonly includes: JsonRecord | null;
    readonly nextToken: string | null;
}

export interface XImportableBookmark {
    readonly caption: string | null;
    readonly externalId: string;
    readonly postedAt: Date | null;
    readonly sourceMetadata: Record<string, unknown>;
    readonly thumbnailUrl: string | null;
    readonly url: string;
}

export interface XAuthenticatedUser {
    readonly id: string;
    readonly name: string | null;
    readonly profileImageUrl: string | null;
    readonly username: string | null;
}

function asRecord(value: unknown): JsonRecord | null {
    return typeof value === "object" && value !== null
        ? (value as JsonRecord)
        : null;
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function readStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
}

function readDate(value: unknown): Date | null {
    const raw = readString(value);
    if (!raw) {
        return null;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseXApiError(payload: unknown, status: number): XApiError {
    const record = asRecord(payload);
    const errors = Array.isArray(record?.errors) ? record.errors : [];
    const firstError = asRecord(errors[0]);
    const message =
        readString(firstError?.detail) ??
        readString(firstError?.title) ??
        readString(record?.title) ??
        `X API request failed with status ${status}.`;
    return new XApiError({ message, status });
}

async function fetchX(
    accessToken: string,
    path: string,
    searchParams?: URLSearchParams
): Promise<unknown> {
    const response = await fetch(
        `${X_API_BASE_URL}${path}${searchParams ? `?${searchParams.toString()}` : ""}`,
        {
            cache: "no-store",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw parseXApiError(payload, response.status);
    }

    return payload;
}

function parseAuthenticatedUser(payload: unknown): XAuthenticatedUser | null {
    const data = asRecord(asRecord(payload)?.data);
    const id = readString(data?.id);
    if (!id) {
        return null;
    }

    return {
        id,
        name: readString(data?.name),
        profileImageUrl: readString(data?.profile_image_url),
        username: readString(data?.username),
    };
}

function mediaMapFromIncludes(includes: JsonRecord | null) {
    const mediaItems = Array.isArray(includes?.media) ? includes.media : [];
    const byMediaKey = new Map<string, JsonRecord>();

    for (const item of mediaItems) {
        const record = asRecord(item);
        const mediaKey = readString(record?.media_key);
        if (mediaKey && record) {
            byMediaKey.set(mediaKey, record);
        }
    }

    return byMediaKey;
}

function userMapFromIncludes(includes: JsonRecord | null) {
    const users = Array.isArray(includes?.users) ? includes.users : [];
    const byId = new Map<string, JsonRecord>();

    for (const item of users) {
        const record = asRecord(item);
        const id = readString(record?.id);
        if (id && record) {
            byId.set(id, record);
        }
    }

    return byId;
}

function firstThumbnailUrl(
    mediaKeys: string[],
    mediaByKey: Map<string, JsonRecord>
) {
    for (const mediaKey of mediaKeys) {
        const media = mediaByKey.get(mediaKey);
        const type = readString(media?.type);
        if (type === "photo") {
            const url = readString(media?.url);
            if (url) {
                return url;
            }
        }

        const previewImageUrl = readString(media?.preview_image_url);
        if (previewImageUrl) {
            return previewImageUrl;
        }
    }

    return null;
}

function noteTweetText(record: JsonRecord | null): string | null {
    const direct = readString(record?.text);
    if (direct) {
        return direct;
    }

    return readString(
        asRecord(asRecord(record?.note_tweet_results)?.result)?.text
    );
}

function entityUrls(record: JsonRecord | null): string[] {
    const entities = asRecord(record?.entities);
    const urls = Array.isArray(entities?.urls) ? entities.urls : [];

    return urls.flatMap((item) => {
        const url = readString(asRecord(item)?.expanded_url);
        return url ? [url] : [];
    });
}

function parseBookmark(
    candidate: unknown,
    includes: JsonRecord | null
): XImportableBookmark | null {
    const record = asRecord(candidate);
    const externalId = readString(record?.id);
    if (!externalId) {
        return null;
    }

    const authorId = readString(record?.author_id);
    const userById = userMapFromIncludes(includes);
    const mediaByKey = mediaMapFromIncludes(includes);
    const author = authorId ? asRecord(userById.get(authorId)) : null;
    const username = readString(author?.username);
    const mediaKeys = readStringArray(
        asRecord(record?.attachments)?.media_keys
    );
    const caption =
        noteTweetText(asRecord(record?.note_tweet)) ?? readString(record?.text);

    return {
        caption,
        externalId,
        postedAt: readDate(record?.created_at),
        sourceMetadata: {
            x: {
                author: authorId
                    ? {
                          id: authorId,
                          name: readString(author?.name),
                          profileImageUrl: readString(
                              author?.profile_image_url
                          ),
                          username,
                      }
                    : null,
                entityUrls: entityUrls(record),
                importTimestamp: new Date().toISOString(),
                mediaKeys,
                possiblySensitive: Boolean(record?.possibly_sensitive),
            },
        },
        thumbnailUrl: firstThumbnailUrl(mediaKeys, mediaByKey),
        url: username
            ? `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(externalId)}`
            : `https://x.com/i/web/status/${encodeURIComponent(externalId)}`,
    };
}

function parseBookmarksPage(payload: unknown): XApiListResponse {
    const record = asRecord(payload);
    const meta = asRecord(record?.meta);

    return {
        data: Array.isArray(record?.data) ? record.data : [],
        includes: asRecord(record?.includes),
        nextToken: readString(meta?.next_token),
    };
}

export async function getXAuthenticatedUser(
    accessToken: string
): Promise<XAuthenticatedUser> {
    const payload = await fetchX(
        accessToken,
        "/users/me",
        new URLSearchParams({
            "user.fields": "id,name,profile_image_url,username",
        })
    );
    const user = parseAuthenticatedUser(payload);
    if (!user) {
        throw new XApiError("Could not resolve the authenticated X user.", 500);
    }
    return user;
}

export async function listXBookmarks(
    accessToken: string,
    userId: string
): Promise<XImportableBookmark[]> {
    const items: XImportableBookmark[] = [];
    let nextToken: string | null = null;

    for (let page = 0; page < MAX_BOOKMARK_PAGES; page += 1) {
        const searchParams = new URLSearchParams({
            expansions: "attachments.media_keys,author_id",
            max_results: String(X_BOOKMARKS_PAGE_SIZE),
            "media.fields": "height,media_key,preview_image_url,type,url,width",
            "tweet.fields":
                "attachments,author_id,created_at,entities,note_tweet,possibly_sensitive,text",
            "user.fields": "id,name,profile_image_url,username",
        });
        if (nextToken) {
            searchParams.set("pagination_token", nextToken);
        }

        const pagePayload = parseBookmarksPage(
            await fetchX(
                accessToken,
                `/users/${encodeURIComponent(userId)}/bookmarks`,
                searchParams
            )
        );

        for (const item of pagePayload.data) {
            const bookmark = parseBookmark(item, pagePayload.includes);
            if (bookmark) {
                items.push(bookmark);
            }
        }

        nextToken = pagePayload.nextToken;
        if (!nextToken) {
            break;
        }
    }

    if (nextToken) {
        throw new XApiError(
            "X bookmark import exceeded the safe pagination limit before completion.",
            502
        );
    }

    return items;
}
