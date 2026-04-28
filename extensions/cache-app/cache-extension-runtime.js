(function initCacheExtensionRuntime(global) {
    const CACHE_APP_DEFAULT_LOCALE = "en-US";
    const CHROME_SYNC_MODES = Object.freeze({
        continuous: "continuous_sync",
        oneTimeImport: "one_time_import",
    });

    const MESSAGE_TYPES = Object.freeze({
        BOOKMARKS_CHUNK: "BOOKMARKS_CHUNK",
        BOOKMARKS_COMPLETE: "BOOKMARKS_COMPLETE",
        CACHE_EXTENSION_READY: "CACHE_EXTENSION_READY",
        CACHE_SITE_BRIDGE: "CACHE_SITE_BRIDGE",
        CACHE_SITE_BRIDGE_REQUEST: "CACHE_SITE_BRIDGE_REQUEST",
        CACHE_SITE_TOKEN: "CACHE_SITE_TOKEN",
        GET_SYNC_META: "GET_SYNC_META",
        SEARCH_CHROME_BOOKMARKS: "SEARCH_CHROME_BOOKMARKS",
        START_SYNC: "START_SYNC",
        SYNC_CHROME_BOOKMARKS: "SYNC_CHROME_BOOKMARKS",
        SYNC_DONE: "SYNC_DONE",
        SYNC_ERROR: "SYNC_ERROR",
        SYNC_PROGRESS: "SYNC_PROGRESS",
        TOGGLE_CHROME_SYNC: "TOGGLE_CHROME_SYNC",
    });

    const STORAGE_KEYS = Object.freeze({
        chromeLastSyncAt: "chromeLastSyncAt",
        chromePendingEvents: "chromePendingEvents",
        chromeSyncEnabled: "chromeSyncEnabled",
        syncApiKey: "syncApiKey",
        syncEndpoint: "syncEndpoint",
    });

    const SOURCE_LABELS = Object.freeze({
        chrome: "Chrome bookmarks",
        chrome_bookmarks: "Chrome bookmarks",
        instagram: "Instagram Saved",
        tiktok: "TikTok Favorites",
        youtube: "YouTube Watch Later",
    });

    function normalizeOrigin(value) {
        return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
    }

    function originFromUrl(raw) {
        const candidate = typeof raw === "string" ? raw.trim() : "";
        if (!candidate) {
            return "";
        }
        try {
            return new URL(candidate).origin;
        } catch {
            return "";
        }
    }

    function getConfiguredCacheAppOrigin() {
        return normalizeOrigin(String(global.CACHE_APP_ORIGIN ?? ""));
    }

    function resolveCacheOrigin(raw) {
        return originFromUrl(raw) || getConfiguredCacheAppOrigin();
    }

    function buildOriginPath(origin, path) {
        const normalizedOrigin = normalizeOrigin(origin);
        return normalizedOrigin && path.startsWith("/")
            ? `${normalizedOrigin}${path}`
            : "";
    }

    function defaultIngestEndpoint(origin = getConfiguredCacheAppOrigin()) {
        return buildOriginPath(origin, String(global.CACHE_INGEST_PATH ?? ""));
    }

    function defaultYouTubeSyncEndpoint(
        origin = getConfiguredCacheAppOrigin()
    ) {
        return buildOriginPath(origin, "/api/integrations/youtube/watch-later");
    }

    function defaultChromeSyncEndpoint(origin = getConfiguredCacheAppOrigin()) {
        return buildOriginPath(origin, "/api/integrations/chrome/sync");
    }

    function ingestEndpointForSource(storedEndpoint, source) {
        const stored =
            typeof storedEndpoint === "string" ? storedEndpoint.trim() : "";

        if (source === "youtube") {
            return defaultYouTubeSyncEndpoint(resolveCacheOrigin(stored));
        }
        if (source === "chrome") {
            return defaultChromeSyncEndpoint(resolveCacheOrigin(stored));
        }
        return stored || defaultIngestEndpoint(resolveCacheOrigin(stored));
    }

    function isYouTubeWatchLaterUrl(rawUrl) {
        try {
            const fallbackOrigin =
                global.location?.origin ?? "https://www.youtube.com";
            const url = new URL(rawUrl, fallbackOrigin);
            return (
                url.hostname.replace(/^www\./, "") === "youtube.com" &&
                url.pathname === "/playlist" &&
                url.searchParams.get("list") === "WL"
            );
        } catch {
            return false;
        }
    }

    function sourceLabel(source) {
        return SOURCE_LABELS[source] ?? "items";
    }

    global.CacheExtensionRuntime = Object.freeze({
        CACHE_APP_DEFAULT_LOCALE,
        CHROME_SYNC_MODES,
        MESSAGE_TYPES,
        STORAGE_KEYS,
        buildOriginPath,
        defaultChromeSyncEndpoint,
        defaultIngestEndpoint,
        defaultYouTubeSyncEndpoint,
        getConfiguredCacheAppOrigin,
        ingestEndpointForSource,
        isYouTubeWatchLaterUrl,
        normalizeOrigin,
        originFromUrl,
        resolveCacheOrigin,
        sourceLabel,
    });
})(globalThis);
