import { IntegrationApiError } from "@/lib/integrations/error";
import {
    asProviderPayloadRecord,
    readPayloadDate,
    readPayloadString,
    readPayloadStringArray,
    type ProviderPayloadRecord,
} from "@/lib/integrations/provider-payload";
import type { Prisma } from "@/prisma/client/client";
import "server-only";

const X_API_BASE_URL = "https://api.x.com/2";
const X_BOOKMARKS_PAGE_SIZE = 100;
const MAX_BOOKMARK_PAGES = 100;

interface XApiListResponse {
    readonly data: unknown[];
    readonly includesLookup: XIncludesLookup;
    readonly nextToken: string | null;
}

interface XIncludesLookup {
    readonly mediaByKey: Map<string, ProviderPayloadRecord>;
    readonly userById: Map<string, ProviderPayloadRecord>;
}

export interface XImportableBookmark {
    readonly caption: string | null;
    readonly externalId: string;
    readonly postedAt: Date | null;
    readonly sourceMetadata: Prisma.InputJsonObject;
    readonly thumbnailUrl: string | null;
    readonly url: string;
}

export interface XAuthenticatedUser {
    readonly id: string;
    readonly name: string | null;
    readonly profileImageUrl: string | null;
    readonly username: string | null;
}

function parseXApiError(payload: unknown, status: number): IntegrationApiError {
    const record = asProviderPayloadRecord(payload);
    const errors = Array.isArray(record?.errors) ? record.errors : [];
    const firstError = asProviderPayloadRecord(errors[0]);
    const message =
        readPayloadString(firstError?.detail) ??
        readPayloadString(firstError?.title) ??
        readPayloadString(record?.title) ??
        `X API request failed with status ${status}.`;
    return new IntegrationApiError({
        integrationId: "x",
        message,
        operation: "fetchX",
        status,
    });
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
    const data = asProviderPayloadRecord(
        asProviderPayloadRecord(payload)?.data
    );
    const id = readPayloadString(data?.id);
    if (!id) {
        return null;
    }

    return {
        id,
        name: readPayloadString(data?.name),
        profileImageUrl: readPayloadString(data?.profile_image_url),
        username: readPayloadString(data?.username),
    };
}

function mediaMapFromIncludes(includes: ProviderPayloadRecord | null) {
    const mediaItems = Array.isArray(includes?.media) ? includes.media : [];
    const byMediaKey = new Map<string, ProviderPayloadRecord>();

    for (const item of mediaItems) {
        const record = asProviderPayloadRecord(item);
        const mediaKey = readPayloadString(record?.media_key);
        if (mediaKey && record) {
            byMediaKey.set(mediaKey, record);
        }
    }

    return byMediaKey;
}

function userMapFromIncludes(includes: ProviderPayloadRecord | null) {
    const users = Array.isArray(includes?.users) ? includes.users : [];
    const byId = new Map<string, ProviderPayloadRecord>();

    for (const item of users) {
        const record = asProviderPayloadRecord(item);
        const id = readPayloadString(record?.id);
        if (id && record) {
            byId.set(id, record);
        }
    }

    return byId;
}

function firstThumbnailUrl(
    mediaKeys: string[],
    mediaByKey: Map<string, ProviderPayloadRecord>
) {
    for (const mediaKey of mediaKeys) {
        const media = mediaByKey.get(mediaKey);
        const type = readPayloadString(media?.type);
        if (type === "photo") {
            const url = readPayloadString(media?.url);
            if (url) {
                return url;
            }
        }

        const previewImageUrl = readPayloadString(media?.preview_image_url);
        if (previewImageUrl) {
            return previewImageUrl;
        }
    }

    return null;
}

function noteTweetText(record: ProviderPayloadRecord | null): string | null {
    const direct = readPayloadString(record?.text);
    if (direct) {
        return direct;
    }

    return readPayloadString(
        asProviderPayloadRecord(
            asProviderPayloadRecord(record?.note_tweet_results)?.result
        )?.text
    );
}

function entityUrls(record: ProviderPayloadRecord | null): string[] {
    const entities = asProviderPayloadRecord(record?.entities);
    const urls = Array.isArray(entities?.urls) ? entities.urls : [];

    return urls.flatMap((item) => {
        const url = readPayloadString(
            asProviderPayloadRecord(item)?.expanded_url
        );
        return url ? [url] : [];
    });
}

function buildIncludesLookup(
    includes: ProviderPayloadRecord | null
): XIncludesLookup {
    return {
        mediaByKey: mediaMapFromIncludes(includes),
        userById: userMapFromIncludes(includes),
    };
}

function parseBookmark(
    candidate: unknown,
    includesLookup: XIncludesLookup
): XImportableBookmark | null {
    const record = asProviderPayloadRecord(candidate);
    const externalId = readPayloadString(record?.id);
    if (!externalId) {
        return null;
    }

    const authorId = readPayloadString(record?.author_id);
    const author = authorId
        ? (includesLookup.userById.get(authorId) ?? null)
        : null;
    const username = readPayloadString(author?.username);
    const mediaKeys = readPayloadStringArray(
        asProviderPayloadRecord(record?.attachments)?.media_keys
    );
    const caption =
        noteTweetText(asProviderPayloadRecord(record?.note_tweet)) ??
        readPayloadString(record?.text);

    return {
        caption,
        externalId,
        postedAt: readPayloadDate(record?.created_at),
        sourceMetadata: {
            x: {
                author: authorId
                    ? {
                          id: authorId,
                          name: readPayloadString(author?.name),
                          profileImageUrl: readPayloadString(
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
        thumbnailUrl: firstThumbnailUrl(mediaKeys, includesLookup.mediaByKey),
        url: username
            ? `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(externalId)}`
            : `https://x.com/i/web/status/${encodeURIComponent(externalId)}`,
    };
}

function parseBookmarksPage(payload: unknown): XApiListResponse {
    const record = asProviderPayloadRecord(payload);
    const meta = asProviderPayloadRecord(record?.meta);
    const includes = asProviderPayloadRecord(record?.includes);

    return {
        data: Array.isArray(record?.data) ? record.data : [],
        includesLookup: buildIncludesLookup(includes),
        nextToken: readPayloadString(meta?.next_token),
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
        throw new IntegrationApiError({
            integrationId: "x",
            message: "Could not resolve the authenticated X user.",
            operation: "getXAuthenticatedUser",
            status: 500,
        });
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
            const bookmark = parseBookmark(item, pagePayload.includesLookup);
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
        throw new IntegrationApiError({
            integrationId: "x",
            message:
                "X bookmark import exceeded the safe pagination limit before completion.",
            operation: "listXBookmarks",
            status: 502,
        });
    }

    return items;
}
