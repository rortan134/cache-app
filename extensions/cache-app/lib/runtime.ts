export const CACHE_APP_DEFAULT_LOCALE = "en-US";

export const CHROME_SYNC_MODES = {
    continuous: "continuous_sync",
    oneTimeImport: "one_time_import",
} as const;

export const MESSAGE_TYPES = {
    API_CALL: "API_CALL",
    BOOKMARKS_CHUNK: "BOOKMARKS_CHUNK",
    BOOKMARKS_COMPLETE: "BOOKMARKS_COMPLETE",
    CACHE_EXTENSION_READY: "CACHE_EXTENSION_READY",
    CACHE_SITE_BRIDGE: "CACHE_SITE_BRIDGE",
    CACHE_SITE_BRIDGE_REQUEST: "CACHE_SITE_BRIDGE_REQUEST",
    CACHE_SITE_OPEN_AND_SYNC: "CACHE_SITE_OPEN_AND_SYNC",
    CACHE_SITE_TOKEN: "CACHE_SITE_TOKEN",
    CONTENT_SCRIPT_READY: "CONTENT_SCRIPT_READY",
    GET_SYNC_META: "GET_SYNC_META",
    SEARCH_CHROME_BOOKMARKS: "SEARCH_CHROME_BOOKMARKS",
    SHOW_POPUP: "SHOW_POPUP",
    START_SYNC: "START_SYNC",
    SYNC_CHROME_BOOKMARKS: "SYNC_CHROME_BOOKMARKS",
    SYNC_DONE: "SYNC_DONE",
    SYNC_ERROR: "SYNC_ERROR",
    SYNC_PROGRESS: "SYNC_PROGRESS",
    TOGGLE_CHROME_SYNC: "TOGGLE_CHROME_SYNC",
} as const;

export const STORAGE_KEYS = {
    autoSyncMarkers: "pendingAutoSyncMarkers",
    chromeLastSyncAt: "chromeLastSyncAt",
    chromePendingEvents: "chromePendingEvents",
    chromeSyncEnabled: "chromeSyncEnabled",
    lastClipCollectionIds: "lastClipCollectionIds",
    syncApiKey: "syncApiKey",
    syncEndpoint: "syncEndpoint",
} as const;

declare const CACHE_APP_ORIGIN: string | undefined;

function normalizeOrigin(value: string): string {
    return value.trim().replace(/\/+$/, "");
}

function originFromUrl(raw: string): string {
    const candidate = raw.trim();
    if (!candidate) {
        return "";
    }
    try {
        return new URL(candidate).origin;
    } catch {
        return "";
    }
}

export function getConfiguredCacheAppOrigin(): string {
    if (typeof CACHE_APP_ORIGIN === "string") {
        return normalizeOrigin(CACHE_APP_ORIGIN);
    }
    return "https://cachd.app";
}

export function resolveCacheOrigin(raw: string): string {
    return originFromUrl(raw) || getConfiguredCacheAppOrigin();
}

export function buildOriginPath(origin: string, path: string): string {
    const normalizedOrigin = normalizeOrigin(origin);
    return normalizedOrigin && path.startsWith("/")
        ? `${normalizedOrigin}${path}`
        : "";
}

export function defaultExtensionCollectionsEndpoint(
    origin = getConfiguredCacheAppOrigin()
): string {
    return buildOriginPath(origin, "/api/integrations/extension/collections");
}

export function defaultExtensionClipEndpoint(
    origin = getConfiguredCacheAppOrigin()
): string {
    return buildOriginPath(origin, "/api/integrations/extension/clip");
}

export function defaultChromeSyncEndpoint(
    origin = getConfiguredCacheAppOrigin()
): string {
    return buildOriginPath(origin, "/api/integrations/chrome/sync");
}

export function isYouTubeWatchLaterUrl(rawUrl: string): boolean {
    try {
        const url = new URL(rawUrl);
        return (
            url.hostname.replace(/^www\./, "") === "youtube.com" &&
            url.pathname === "/playlist" &&
            url.searchParams.get("list") === "WL"
        );
    } catch {
        return false;
    }
}

const INSTAGRAM_SAVED_PATH_RE = /^https:\/\/www\.instagram\.com\/[^/?#]+\/saved\b/;
const TIKTOK_FAVORITES_PATH_RE = /^https:\/\/www\.tiktok\.com\/[^/?#]+\/favorites\b/;

export function isSocialImportUrl(rawUrl: string): boolean {
    if (INSTAGRAM_SAVED_PATH_RE.test(rawUrl)) {
        return true;
    }
    if (TIKTOK_FAVORITES_PATH_RE.test(rawUrl)) {
        return true;
    }
    return isYouTubeWatchLaterUrl(rawUrl);
}

export function isUnsupportedClipUrl(rawUrl: string): boolean {
    if (!rawUrl) {
        return true;
    }
    return (
        rawUrl.startsWith("chrome://") ||
        rawUrl.startsWith("chrome-extension://") ||
        rawUrl.startsWith("edge://") ||
        rawUrl.startsWith("about:") ||
        rawUrl.startsWith("javascript:") ||
        rawUrl.startsWith("data:")
    );
}

export function sourceLabel(source: string): string {
    const labels: Record<string, string> = {
        chrome: "Chrome bookmarks",
        chrome_bookmarks: "Chrome bookmarks",
        instagram: "Instagram Saved",
        tiktok: "TikTok Favorites",
        youtube: "YouTube Watch Later",
    };
    return labels[source] ?? "items";
}
