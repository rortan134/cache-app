importScripts("cache-config.js");

/** @typedef {{ shortcode: string, url: string, thumbnailUrl: string, caption: string, postedAt: string, scrapedAt: string }} InstagramSavedItem */
/** @typedef {{ id: string, url: string, thumbnailUrl: string, caption: string, postedAt: string, scrapedAt: string }} TikTokFavoriteItem */
/** @typedef {{ videoId: string, videoUrl: string, title: string, thumbnailUrl: string, channelName: string, channelId: string, duration: string, playlistItemId: string, position: number | null, publishedAt: string | null, availability: string, scrapedAt: string }} YouTubeWatchLaterItem */

const INSTAGRAM_STORAGE_VERSION = 1;
const TIKTOK_STORAGE_VERSION = 1;
const YOUTUBE_STORAGE_VERSION = 1;
const CHROME_SYNC_BATCH_SIZE = 200;
const DEFAULT_BROWSER_PROFILE_ID = "default";

const INSTAGRAM_KEYS = {
    bookmarkCount: "bookmarkCount",
    bookmarks: "instagramSavedBookmarks",
    lastSyncAt: "lastSyncAt",
    storageVersion: "storageVersion",
};

const TIKTOK_KEYS = {
    favoriteCount: "tiktokFavoriteCount",
    lastSyncAt: "tiktokLastSyncAt",
    storageVersion: "tiktokStorageVersion",
    videos: "tiktokFavoriteVideos",
};

const YOUTUBE_KEYS = {
    items: "youtubeWatchLaterItems",
    lastSyncAt: "youtubeWatchLaterLastSyncAt",
    storageVersion: "youtubeWatchLaterStorageVersion",
    videoCount: "youtubeWatchLaterVideoCount",
};

const CHROME_KEYS = {
    bookmarkCount: "chromeBookmarkCount",
    browserProfileId: "chromeBrowserProfileId",
    deviceId: "chromeDeviceId",
    deviceName: "chromeDeviceName",
    lastError: "chromeLastError",
    lastSyncAt: "chromeLastSyncAt",
    pendingEvents: "chromePendingEvents",
    pendingMode: "chromePendingMode",
    syncEnabled: "chromeSyncEnabled",
};

const SYNC_KEYS = {
    syncApiKey: "syncApiKey",
    syncEndpoint: "syncEndpoint",
};

let chromeFlushInFlight = null;

function defaultIngestEndpoint() {
    const origin = String(globalThis.CACHE_APP_ORIGIN ?? "").replace(/\/$/, "");
    const path = String(globalThis.CACHE_INGEST_PATH ?? "");
    if (!(origin && path.startsWith("/"))) {
        return "";
    }
    return `${origin}${path}`;
}

function defaultYouTubeSyncEndpoint() {
    const origin = String(globalThis.CACHE_APP_ORIGIN ?? "").replace(/\/$/, "");
    return origin ? `${origin}/api/integrations/youtube/watch-later` : "";
}

function defaultChromeSyncEndpoint() {
    const origin = String(globalThis.CACHE_APP_ORIGIN ?? "").replace(/\/$/, "");
    return origin ? `${origin}/api/integrations/chrome/sync` : "";
}

function cacheOriginFromEndpoint(raw) {
    const endpoint = typeof raw === "string" ? raw.trim() : "";
    if (endpoint) {
        try {
            return new URL(endpoint).origin;
        } catch {}
    }

    return String(globalThis.CACHE_APP_ORIGIN ?? "").replace(/\/$/, "");
}

function ingestEndpointForSource(storedEndpoint, source) {
    const stored =
        typeof storedEndpoint === "string" ? storedEndpoint.trim() : "";
    if (source === "youtube") {
        return cacheOriginFromEndpoint(stored)
            ? `${cacheOriginFromEndpoint(stored)}/api/integrations/youtube/watch-later`
            : defaultYouTubeSyncEndpoint();
    }
    return stored || defaultIngestEndpoint();
}

function messageSource(msg) {
    if (msg && typeof msg === "object") {
        if (msg.source === "tiktok") {
            return "tiktok";
        }
        if (msg.source === "youtube") {
            return "youtube";
        }
        if (msg.source === "chrome_bookmarks" || msg.source === "chrome") {
            return "chrome_bookmarks";
        }
    }
    return "instagram";
}

function generateClientId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureChromeIdentity() {
    const stored = await chrome.storage.local.get([
        CHROME_KEYS.browserProfileId,
        CHROME_KEYS.deviceId,
        CHROME_KEYS.deviceName,
    ]);

    const patch = {};
    const profileId =
        typeof stored[CHROME_KEYS.browserProfileId] === "string" &&
        stored[CHROME_KEYS.browserProfileId]
            ? stored[CHROME_KEYS.browserProfileId]
            : generateClientId("chrome_profile");
    const deviceId =
        typeof stored[CHROME_KEYS.deviceId] === "string" &&
        stored[CHROME_KEYS.deviceId]
            ? stored[CHROME_KEYS.deviceId]
            : generateClientId("device");
    if (profileId !== stored[CHROME_KEYS.browserProfileId]) {
        patch[CHROME_KEYS.browserProfileId] = profileId;
    }
    if (deviceId !== stored[CHROME_KEYS.deviceId]) {
        patch[CHROME_KEYS.deviceId] = deviceId;
    }

    let deviceName =
        typeof stored[CHROME_KEYS.deviceName] === "string"
            ? stored[CHROME_KEYS.deviceName]
            : "";
    if (!deviceName) {
        try {
            const platform = await chrome.runtime.getPlatformInfo();
            deviceName = `Chrome on ${platform.os}`;
        } catch {
            deviceName = "Chrome browser";
        }
        patch[CHROME_KEYS.deviceName] = deviceName;
    }

    if (Object.keys(patch).length > 0) {
        await chrome.storage.local.set(patch);
    }

    return { deviceId, deviceName, profileId };
}

function mapChromeBookmarkNode(node, browserProfileId) {
    return {
        dateAdded:
            typeof node.dateAdded === "number" ? node.dateAdded : undefined,
        dateGroupModified:
            typeof node.dateGroupModified === "number"
                ? node.dateGroupModified
                : undefined,
        externalId: String(node.id),
        index: typeof node.index === "number" ? node.index : undefined,
        kind: node.url ? "bookmark" : "folder",
        parentExternalId:
            typeof node.parentId === "string" && node.parentId
                ? node.parentId
                : undefined,
        title: typeof node.title === "string" ? node.title : "",
        url:
            typeof node.url === "string" && node.url
                ? node.url
                : `cache://chrome-bookmarks/folder/${encodeURIComponent(browserProfileId)}/${encodeURIComponent(String(node.id))}`,
    };
}

function flattenChromeBookmarkTree(
    nodes,
    browserProfileId,
    result,
    snapshotIds
) {
    for (const node of nodes) {
        const externalId = String(node.id);
        snapshotIds.push(externalId);
        result.push({
            bookmark: mapChromeBookmarkNode(node, browserProfileId),
            occurredAt: new Date().toISOString(),
            type: "upsert",
        });
        if (node.children) {
            flattenChromeBookmarkTree(
                node.children,
                browserProfileId,
                result,
                snapshotIds
            );
        }
    }
}

async function readSyncMetaForUi() {
    const data = await chrome.storage.local.get([
        INSTAGRAM_KEYS.bookmarkCount,
        INSTAGRAM_KEYS.lastSyncAt,
        TIKTOK_KEYS.favoriteCount,
        TIKTOK_KEYS.lastSyncAt,
        YOUTUBE_KEYS.lastSyncAt,
        YOUTUBE_KEYS.videoCount,
        CHROME_KEYS.bookmarkCount,
        CHROME_KEYS.lastError,
        CHROME_KEYS.lastSyncAt,
        CHROME_KEYS.pendingEvents,
        CHROME_KEYS.syncEnabled,
    ]);
    const chromePending = Array.isArray(data[CHROME_KEYS.pendingEvents])
        ? data[CHROME_KEYS.pendingEvents].length
        : 0;
    return {
        chromeContinuousSync: data[CHROME_KEYS.syncEnabled] === true,
        chromeCount:
            typeof data[CHROME_KEYS.bookmarkCount] === "number"
                ? data[CHROME_KEYS.bookmarkCount]
                : 0,
        chromeLastError:
            typeof data[CHROME_KEYS.lastError] === "string"
                ? data[CHROME_KEYS.lastError]
                : "",
        chromeLastSyncAt:
            typeof data[CHROME_KEYS.lastSyncAt] === "string"
                ? data[CHROME_KEYS.lastSyncAt]
                : undefined,
        chromePendingEvents: chromePending,
        instagramCount:
            typeof data[INSTAGRAM_KEYS.bookmarkCount] === "number"
                ? data[INSTAGRAM_KEYS.bookmarkCount]
                : 0,
        instagramLastSyncAt:
            typeof data[INSTAGRAM_KEYS.lastSyncAt] === "string"
                ? data[INSTAGRAM_KEYS.lastSyncAt]
                : undefined,
        tiktokCount:
            typeof data[TIKTOK_KEYS.favoriteCount] === "number"
                ? data[TIKTOK_KEYS.favoriteCount]
                : 0,
        tiktokLastSyncAt:
            typeof data[TIKTOK_KEYS.lastSyncAt] === "string"
                ? data[TIKTOK_KEYS.lastSyncAt]
                : undefined,
        youtubeCount:
            typeof data[YOUTUBE_KEYS.videoCount] === "number"
                ? data[YOUTUBE_KEYS.videoCount]
                : 0,
        youtubeLastSyncAt:
            typeof data[YOUTUBE_KEYS.lastSyncAt] === "string"
                ? data[YOUTUBE_KEYS.lastSyncAt]
                : undefined,
    };
}

async function notifySyncError(code, message) {
    await chrome.runtime
        .sendMessage({
            code,
            message: message ?? "",
            type: "SYNC_ERROR",
        })
        .catch(() => {});
}

async function notifySyncProgress(activeSource) {
    const meta = await readSyncMetaForUi();
    await chrome.runtime
        .sendMessage({
            activeSource,
            type: "SYNC_PROGRESS",
            ...meta,
        })
        .catch(() => {});
}

async function notifySyncDone(completedSource) {
    const meta = await readSyncMetaForUi();
    await chrome.runtime
        .sendMessage({
            completedSource,
            type: "SYNC_DONE",
            ...meta,
        })
        .catch(() => {});
}

async function postToOptionalBackend(endpoint, apiKey, items, source) {
    if (!endpoint?.trim()) {
        return;
    }
    if (!apiKey?.trim()) {
        console.warn(
            "[Cache App] Skipping server sync: no ingest token. Open any Cache page while signed in once."
        );
        return;
    }
    const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    headers.Authorization = `Bearer ${apiKey.trim()}`;
    const res = await fetch(endpoint.trim(), {
        body: JSON.stringify({
            items,
            source,
            syncedAt: new Date().toISOString(),
        }),
        headers,
        method: "POST",
    });
    if (!res.ok) {
        console.warn(
            "[Cache App] Optional sync failed:",
            source,
            res.status,
            await res.text().catch(() => "")
        );
    }
}

async function postYouTubeSnapshot(endpoint, apiKey, payload) {
    if (!endpoint?.trim()) {
        throw new Error("Missing YouTube sync endpoint.");
    }
    if (!apiKey?.trim()) {
        throw new Error(
            "No ingest token found. Open Cache while signed in so the extension can link this browser."
        );
    }
    const res = await fetch(endpoint.trim(), {
        body: JSON.stringify(payload),
        credentials: "include",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
            `YouTube Watch Later sync failed (${res.status}): ${body}`
        );
    }
    return res.json().catch(() => null);
}

async function postChromeSyncBatch(endpoint, apiKey, payload) {
    if (!endpoint?.trim()) {
        throw new Error("Missing Chrome sync endpoint.");
    }
    if (!apiKey?.trim()) {
        throw new Error(
            "No ingest token found. Open Cache while signed in so the extension can link this browser."
        );
    }
    const res = await fetch(endpoint.trim(), {
        body: JSON.stringify(payload),
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Chrome bookmark sync failed (${res.status}): ${body}`);
    }
    return res.json().catch(() => null);
}

async function readChromeQueueState() {
    const data = await chrome.storage.local.get([
        CHROME_KEYS.pendingEvents,
        CHROME_KEYS.pendingMode,
        CHROME_KEYS.syncEnabled,
    ]);
    return {
        events: Array.isArray(data[CHROME_KEYS.pendingEvents])
            ? data[CHROME_KEYS.pendingEvents]
            : [],
        mode:
            data[CHROME_KEYS.pendingMode] === "one_time_import"
                ? "one_time_import"
                : "continuous_sync",
        syncEnabled: data[CHROME_KEYS.syncEnabled] === true,
    };
}

async function setChromeLastError(message) {
    await chrome.storage.local.set({
        [CHROME_KEYS.lastError]: message,
    });
}

async function enqueueChromeEvents(events, mode) {
    if (!Array.isArray(events) || events.length === 0) {
        return;
    }
    const current = await readChromeQueueState();
    await chrome.storage.local.set({
        [CHROME_KEYS.pendingEvents]: [...current.events, ...events],
        [CHROME_KEYS.pendingMode]: mode ?? current.mode,
    });
    await notifySyncProgress("chrome");
}

async function flushChromeBookmarkQueue() {
    if (chromeFlushInFlight) {
        return chromeFlushInFlight;
    }

    chromeFlushInFlight = (async () => {
        const settings = await chrome.storage.local.get([
            CHROME_KEYS.bookmarkCount,
            CHROME_KEYS.pendingEvents,
            CHROME_KEYS.pendingMode,
            SYNC_KEYS.syncApiKey,
            SYNC_KEYS.syncEndpoint,
        ]);
        const pendingEvents = Array.isArray(settings[CHROME_KEYS.pendingEvents])
            ? settings[CHROME_KEYS.pendingEvents]
            : [];
        if (pendingEvents.length === 0) {
            chromeFlushInFlight = null;
            return;
        }

        const identity = await ensureChromeIdentity();
        const apiKey =
            typeof settings[SYNC_KEYS.syncApiKey] === "string"
                ? settings[SYNC_KEYS.syncApiKey]
                : "";
        const storedEndpoint =
            typeof settings[SYNC_KEYS.syncEndpoint] === "string"
                ? settings[SYNC_KEYS.syncEndpoint]
                : "";
        const endpoint = storedEndpoint.trim()
            ? `${storedEndpoint.replace(/\/api\/integrations\/instagram\/saved$/, "")}/api/integrations/chrome/sync`
            : defaultChromeSyncEndpoint();
        const mode =
            settings[CHROME_KEYS.pendingMode] === "one_time_import"
                ? "one_time_import"
                : "continuous_sync";

        try {
            await notifySyncProgress("chrome");

            let offset = 0;
            while (offset < pendingEvents.length) {
                const batch = pendingEvents.slice(
                    offset,
                    offset + CHROME_SYNC_BATCH_SIZE
                );
                await postChromeSyncBatch(endpoint, apiKey, {
                    browserProfileId:
                        identity.profileId || DEFAULT_BROWSER_PROFILE_ID,
                    device: {
                        id: identity.deviceId,
                        name: identity.deviceName,
                    },
                    events: batch,
                    mode,
                    syncedAt: new Date().toISOString(),
                });
                offset += batch.length;
            }

            const bookmarkCount = pendingEvents.reduce((count, event) => {
                if (event?.type === "upsert" || event?.type === "move") {
                    return (
                        count + (event.bookmark?.kind === "bookmark" ? 1 : 0)
                    );
                }
                return count;
            }, 0);

            await chrome.storage.local.set({
                [CHROME_KEYS.bookmarkCount]: Math.max(
                    typeof settings[CHROME_KEYS.bookmarkCount] === "number"
                        ? settings[CHROME_KEYS.bookmarkCount]
                        : 0,
                    bookmarkCount
                ),
                [CHROME_KEYS.lastError]: "",
                [CHROME_KEYS.lastSyncAt]: new Date().toISOString(),
                [CHROME_KEYS.pendingEvents]: [],
            });
            await notifySyncDone("chrome");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.warn("[Cache App] Chrome bookmark sync error:", error);
            await setChromeLastError(message);
            await notifySyncError("CHROME_SYNC_FAILED", message);
        } finally {
            chromeFlushInFlight = null;
        }
    })();

    return chromeFlushInFlight;
}

async function queueChromeBookmarkNode(node, type) {
    const identity = await ensureChromeIdentity();
    const bookmark = mapChromeBookmarkNode(node, identity.profileId);
    await enqueueChromeEvents(
        [
            {
                bookmark,
                occurredAt: new Date().toISOString(),
                type,
            },
        ],
        "continuous_sync"
    );
    await flushChromeBookmarkQueue();
}

async function queueChromeDelete(externalId) {
    await enqueueChromeEvents(
        [
            {
                externalId: String(externalId),
                occurredAt: new Date().toISOString(),
                type: "delete",
            },
        ],
        "continuous_sync"
    );
    await flushChromeBookmarkQueue();
}

async function runChromeInitialImport(mode) {
    const identity = await ensureChromeIdentity();
    const tree = await chrome.bookmarks.getTree();
    const events = [];
    const snapshotExternalIds = [];
    flattenChromeBookmarkTree(
        tree,
        identity.profileId,
        events,
        snapshotExternalIds
    );

    const bookmarkCount = events.reduce((count, event) => {
        return count + (event.bookmark?.kind === "bookmark" ? 1 : 0);
    }, 0);

    events.push({
        snapshotExternalIds,
        type: "import_complete",
    });

    await chrome.storage.local.set({
        [CHROME_KEYS.bookmarkCount]: bookmarkCount,
        [CHROME_KEYS.lastError]: "",
        [CHROME_KEYS.syncEnabled]: mode === "continuous_sync",
    });
    await enqueueChromeEvents(events, mode);
    await flushChromeBookmarkQueue();
}

async function searchChromeBookmarks(query) {
    if (!query?.trim()) {
        return [];
    }
    const results = await chrome.bookmarks.search(query.trim());
    const identity = await ensureChromeIdentity();
    return results.map((node) =>
        mapChromeBookmarkNode(node, identity.profileId)
    );
}

async function migrateItemsIfNeeded(data, versionKey, itemsKey, targetVersion) {
    const version =
        typeof data[versionKey] === "number" ? data[versionKey] : 0;
    const raw = data[itemsKey];
    let items = Array.isArray(raw) ? raw : [];

    if (version < targetVersion) {
        items = items
            .map((row) =>
                row && typeof row === "object" && !Array.isArray(row)
                    ? row
                    : null
            )
            .filter(Boolean);
        await chrome.storage.local.set({
            [itemsKey]: items,
            [versionKey]: targetVersion,
        });
    }

    return items;
}

function mergeByShortcode(incoming, existing) {
    const map = new Map();
    for (const item of existing) {
        if (item?.shortcode) {
            map.set(item.shortcode, item);
        }
    }
    for (const item of incoming) {
        if (item?.shortcode) {
            const prev = map.get(item.shortcode);
            map.set(item.shortcode, {
                ...prev,
                ...item,
                postedAt: item.postedAt || prev?.postedAt,
                scrapedAt:
                    item.scrapedAt ||
                    prev?.scrapedAt ||
                    new Date().toISOString(),
            });
        }
    }
    return [...map.values()];
}

function mergeByVideoId(incoming, existing) {
    const map = new Map();
    for (const item of existing) {
        if (item?.id) {
            map.set(item.id, item);
        }
    }
    for (const item of incoming) {
        if (item?.id) {
            const prev = map.get(item.id);
            map.set(item.id, {
                ...prev,
                ...item,
                postedAt: item.postedAt || prev?.postedAt,
                scrapedAt:
                    item.scrapedAt ||
                    prev?.scrapedAt ||
                    new Date().toISOString(),
            });
        }
    }
    return [...map.values()];
}

function mergeByYouTubeVideoId(incoming, existing) {
    const map = new Map();
    for (const item of existing) {
        if (item?.videoId) {
            map.set(item.videoId, item);
        }
    }
    for (const item of incoming) {
        if (item?.videoId) {
            const prev = map.get(item.videoId);
            map.set(item.videoId, {
                ...prev,
                ...item,
                availability:
                    item.availability || prev?.availability || "available",
                channelId: item.channelId || prev?.channelId || "",
                channelName: item.channelName || prev?.channelName || "",
                duration: item.duration || prev?.duration || "",
                playlistItemId:
                    item.playlistItemId || prev?.playlistItemId || "",
                position:
                    typeof item.position === "number"
                        ? item.position
                        : (prev?.position ?? null),
                publishedAt: item.publishedAt || prev?.publishedAt || null,
                scrapedAt:
                    item.scrapedAt ||
                    prev?.scrapedAt ||
                    new Date().toISOString(),
                thumbnailUrl: item.thumbnailUrl || prev?.thumbnailUrl || "",
                title: item.title || prev?.title || "",
                videoUrl:
                    item.videoUrl ||
                    prev?.videoUrl ||
                    `https://www.youtube.com/watch?v=${encodeURIComponent(item.videoId)}`,
            });
        }
    }
    return [...map.values()];
}

function sanitizeYouTubeSnapshotItem(item) {
    const videoId =
        typeof item?.videoId === "string" ? item.videoId.trim() : "";
    if (!videoId) {
        return null;
    }

    const videoUrl =
        typeof item?.videoUrl === "string" && item.videoUrl.trim()
            ? item.videoUrl.trim()
            : `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const thumbnailUrl =
        typeof item?.thumbnailUrl === "string" && item.thumbnailUrl.trim()
            ? item.thumbnailUrl.trim()
            : undefined;

    return {
        availability:
            typeof item?.availability === "string" && item.availability.trim()
                ? item.availability.trim()
                : "available",
        channelId:
            typeof item?.channelId === "string" && item.channelId.trim()
                ? item.channelId.trim()
                : undefined,
        channelName:
            typeof item?.channelName === "string" && item.channelName.trim()
                ? item.channelName.trim()
                : undefined,
        duration:
            typeof item?.duration === "string" && item.duration.trim()
                ? item.duration.trim()
                : undefined,
        playlistItemId:
            typeof item?.playlistItemId === "string" &&
            item.playlistItemId.trim()
                ? item.playlistItemId.trim()
                : undefined,
        position:
            typeof item?.position === "number" ? item.position : undefined,
        publishedAt:
            typeof item?.publishedAt === "string" && item.publishedAt.trim()
                ? item.publishedAt.trim()
                : undefined,
        scrapedAt:
            typeof item?.scrapedAt === "string" && item.scrapedAt.trim()
                ? item.scrapedAt.trim()
                : new Date().toISOString(),
        thumbnailUrl,
        title:
            typeof item?.title === "string" && item.title.trim()
                ? item.title.trim()
                : undefined,
        videoId,
        videoUrl,
    };
}

async function persistBookmarkItems(items, options) {
    let keys, storageVersion, mergeFn, itemsKey, countKey;

    if (options.source === "youtube") {
        keys = YOUTUBE_KEYS;
        storageVersion = YOUTUBE_STORAGE_VERSION;
        itemsKey = YOUTUBE_KEYS.items;
        countKey = YOUTUBE_KEYS.videoCount;
        mergeFn = mergeByYouTubeVideoId;
    } else if (options.source === "tiktok") {
        keys = TIKTOK_KEYS;
        storageVersion = TIKTOK_STORAGE_VERSION;
        itemsKey = TIKTOK_KEYS.videos;
        countKey = TIKTOK_KEYS.favoriteCount;
        mergeFn = mergeByVideoId;
    } else {
        keys = INSTAGRAM_KEYS;
        storageVersion = INSTAGRAM_STORAGE_VERSION;
        itemsKey = INSTAGRAM_KEYS.bookmarks;
        countKey = INSTAGRAM_KEYS.bookmarkCount;
        mergeFn = mergeByShortcode;
    }

    const data = await chrome.storage.local.get([
        itemsKey,
        keys.storageVersion,
        SYNC_KEYS.syncEndpoint,
        SYNC_KEYS.syncApiKey,
    ]);

    const existing = await migrateItemsIfNeeded(data, keys.storageVersion, itemsKey, storageVersion);
    const incoming = Array.isArray(items) ? items : [];
    const merged = mergeFn(incoming, existing);

    const patch = {
        [itemsKey]: merged,
        [keys.storageVersion]: storageVersion,
    };
    if (countKey) {
        patch[countKey] = merged.length;
    }

    if (options.final) {
        if (keys.lastSyncAt) {
            patch[keys.lastSyncAt] = new Date().toISOString();
        }
        await chrome.storage.local.set(patch);

        const endpoint = options.source === "youtube"
            ? ingestEndpointForSource(data[SYNC_KEYS.syncEndpoint], "youtube")
            : (typeof data[SYNC_KEYS.syncEndpoint] === "string" ? data[SYNC_KEYS.syncEndpoint] : "").trim() || defaultIngestEndpoint();

        const apiKey = typeof data[SYNC_KEYS.syncApiKey] === "string" ? data[SYNC_KEYS.syncApiKey] : "";

        try {
            if (options.source === "youtube") {
                const identity = await ensureChromeIdentity();
                const payloadItems = merged
                    .map((item) => sanitizeYouTubeSnapshotItem(item))
                    .filter(Boolean);
                await postYouTubeSnapshot(endpoint, apiKey, {
                    browserProfileId: identity.profileId || DEFAULT_BROWSER_PROFILE_ID,
                    items: payloadItems,
                    snapshotComplete: true,
                    sourceDeviceId: identity.deviceId,
                    sourceDeviceName: identity.deviceName,
                });
            } else {
                await postToOptionalBackend(endpoint, apiKey, merged, options.source);
            }
        } catch (error) {
            console.warn(`[Cache App] ${options.source} optional sync error:`, error);
            if (options.source === "youtube") {
                await notifySyncError("YOUTUBE_SYNC_FAILED", error instanceof Error ? error.message : String(error));
            }
        }

        await notifySyncDone(options.source);
    } else {
        await chrome.storage.local.set(patch);
        await notifySyncProgress(options.source);
    }
}

chrome.bookmarks.onCreated.addListener((_id, node) => {
    void queueChromeBookmarkNode(node, "upsert");
});

chrome.bookmarks.onRemoved.addListener((id) => {
    void queueChromeDelete(id);
});

chrome.bookmarks.onChanged.addListener((id) => {
    void chrome.bookmarks
        .get(id)
        .then((nodes) => {
            if (nodes[0]) {
                return queueChromeBookmarkNode(nodes[0], "upsert");
            }
        })
        .catch((error) => {
            console.warn(
                "[Cache App] Could not reload changed bookmark",
                error
            );
        });
});

chrome.bookmarks.onMoved.addListener((id) => {
    void chrome.bookmarks
        .get(id)
        .then((nodes) => {
            if (nodes[0]) {
                return queueChromeBookmarkNode(nodes[0], "move");
            }
        })
        .catch((error) => {
            console.warn("[Cache App] Could not reload moved bookmark", error);
        });
});

chrome.bookmarks.onChildrenReordered.addListener((id) => {
    void chrome.bookmarks
        .getChildren(id)
        .then((children) =>
            Promise.all(
                children.map((child) => queueChromeBookmarkNode(child, "move"))
            )
        )
        .catch((error) => {
            console.warn(
                "[Cache App] Could not reload reordered folder",
                error
            );
        });
});

chrome.bookmarks.onImportEnded.addListener(() => {
    void runChromeInitialImport("continuous_sync");
});

chrome.runtime.onInstalled.addListener(() => {
    void ensureChromeIdentity();
    void flushChromeBookmarkQueue();
});

chrome.runtime.onStartup?.addListener(() => {
    void ensureChromeIdentity();
    void flushChromeBookmarkQueue();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "CACHE_SITE_BRIDGE") {
        (async () => {
            const endpoint =
                typeof msg.endpoint === "string" ? msg.endpoint.trim() : "";
            const token = typeof msg.token === "string" ? msg.token.trim() : "";
            if (!(endpoint && token)) {
                return;
            }
            await chrome.storage.local.set({
                [SYNC_KEYS.syncApiKey]: token,
                [SYNC_KEYS.syncEndpoint]: endpoint,
            });
            await flushChromeBookmarkQueue();
        })();
        return true;
    }

    if (msg?.type === "BOOKMARKS_CHUNK" || msg?.type === "BOOKMARKS_COMPLETE") {
        (async () => {
            try {
                await persistBookmarkItems(
                    Array.isArray(msg.items) ? msg.items : [],
                    {
                        final: msg.type === "BOOKMARKS_COMPLETE",
                        source: messageSource(msg),
                    }
                );
            } catch (error) {
                console.error("[Cache App] bookmark persist failed:", error);
                await notifySyncError(
                    "MERGE_FAILED",
                    error instanceof Error ? error.message : String(error)
                );
            }
        })();
        return true;
    }

    if (msg?.type === "SYNC_ERROR") {
        (async () => {
            await notifySyncError(
                typeof msg.code === "string" ? msg.code : "UNKNOWN",
                msg.message
            );
        })();
        return true;
    }

    if (msg?.type === "SYNC_CHROME_BOOKMARKS") {
        (async () => {
            try {
                const mode =
                    msg.mode === "one_time_import"
                        ? "one_time_import"
                        : "continuous_sync";
                await runChromeInitialImport(mode);
                sendResponse?.({ ok: true });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                await setChromeLastError(message);
                await notifySyncError("CHROME_SYNC_FAILED", message);
                sendResponse?.({ error: message, ok: false });
            }
        })();
        return true;
    }

    if (msg?.type === "TOGGLE_CHROME_SYNC") {
        (async () => {
            await chrome.storage.local.set({
                [CHROME_KEYS.syncEnabled]: !!msg.enabled,
            });
            if (msg.enabled) {
                await runChromeInitialImport("continuous_sync");
            }
            sendResponse?.({ ok: true });
        })();
        return true;
    }

    if (msg?.type === "SEARCH_CHROME_BOOKMARKS") {
        (async () => {
            const results = await searchChromeBookmarks(
                typeof msg.query === "string" ? msg.query : ""
            );
            sendResponse?.({ ok: true, results });
        })();
        return true;
    }

    if (msg?.type === "GET_SYNC_META") {
        (async () => {
            const meta = await readSyncMetaForUi();
            sendResponse?.({ ok: true, ...meta });
        })();
        return true;
    }

    return false;
});
