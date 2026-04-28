const statusEl = document.getElementById("status");
const syncBtn = document.getElementById("sync");
const chromeSyncBtn = document.getElementById("chromeSync");
const chromeContinuousEl = document.getElementById("chromeContinuous");
const openCacheBtnEl = document.getElementById("openCache");

const {
    CACHE_APP_DEFAULT_LOCALE,
    CHROME_SYNC_MODES,
    MESSAGE_TYPES,
    STORAGE_KEYS,
    getConfiguredCacheAppOrigin,
    isYouTubeWatchLaterUrl,
    resolveCacheOrigin,
    sourceLabel,
} = globalThis.CacheExtensionRuntime;

function readTrimmedStorageString(data, key) {
    return typeof data?.[key] === "string" ? data[key].trim() : "";
}

function setActionButtonsDisabled(disabled) {
    if (syncBtn) {
        syncBtn.disabled = disabled;
    }
    if (chromeSyncBtn) {
        chromeSyncBtn.disabled = disabled;
    }
}

function cacheHostLabel(origin) {
    try {
        return new URL(origin).host;
    } catch {
        return "Cache";
    }
}

function setOpenCacheVisible(visible) {
    if (!openCacheBtnEl) {
        return;
    }
    openCacheBtnEl.style.display = visible ? "" : "none";
}

async function requestBridgeFromOpenCacheTab() {
    const appOrigin = getConfiguredCacheAppOrigin();
    if (!appOrigin) {
        return false;
    }
    let tabs = [];
    let urlPatterns = [`${appOrigin}/*`];
    try {
        const u = new URL(appOrigin);
        if (
            u.protocol === "https:" &&
            u.hostname.split(".").length === 2 &&
            !u.hostname.startsWith("www.")
        ) {
            urlPatterns = [...urlPatterns, `https://www.${u.hostname}/*`];
        }
    } catch {}

    try {
        tabs = await chrome.tabs.query({ url: urlPatterns });
    } catch {
        return false;
    }

    for (const tab of tabs) {
        if (!tab.id) {
            continue;
        }
        try {
            const res = await chrome.tabs.sendMessage(tab.id, {
                type: MESSAGE_TYPES.CACHE_SITE_BRIDGE_REQUEST,
            });
            if (res && typeof res === "object" && res.ok === true) {
                return true;
            }
        } catch {}
    }
    return false;
}

function setStatus(text, kind) {
    if (!statusEl) {
        return;
    }
    statusEl.textContent = text;
    statusEl.classList.remove("error", "ok");
    if (kind === "error") {
        statusEl.classList.add("error");
    }
    if (kind === "ok") {
        statusEl.classList.add("ok");
    }
}

function formatErrorMessage(code, message) {
    const map = {
        CHROME_SYNC_FAILED:
            message || "Chrome bookmarks could not be synced right now.",
        MERGE_FAILED: message || "Could not save data.",
        NO_ITEMS: "No items found. Scroll the grid, then sync again.",
        NOT_SAVED_PAGE: "Open your Saved collection on Instagram first.",
        NOT_YOUTUBE_WATCH_LATER:
            "Open YouTube Watch Later (/playlist?list=WL) first.",
        SCRAPE_FAILED: message || "Could not read the page.",
        UNKNOWN: message || "Something went wrong.",
        UNSUPPORTED_PAGE:
            "Open Instagram Saved, TikTok Favorites, or YouTube Watch Later in this tab.",
    };
    return map[code] ?? message ?? "Sync failed.";
}

async function loadMeta() {
    const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_SYNC_META,
    });
    return response && typeof response === "object" ? response : {};
}

async function refreshFromStorage() {
    const meta = await loadMeta();

    const isContinuous = meta.chromeContinuousSync === true;
    if (chromeContinuousEl) {
        chromeContinuousEl.checked = isContinuous;
    }
    if (chromeSyncBtn) {
        chromeSyncBtn.style.display = isContinuous ? "none" : "";
    }
}

async function applyCacheSessionGate() {
    const appOrigin = getConfiguredCacheAppOrigin();
    if (!appOrigin) {
        setActionButtonsDisabled(true);
        setOpenCacheVisible(true);
        setStatus(
            "Extension is missing CACHE_APP_ORIGIN in cache-config.js.",
            "error"
        );
        return false;
    }

    const keyData = await chrome.storage.local.get([STORAGE_KEYS.syncApiKey]);
    let token = readTrimmedStorageString(keyData, STORAGE_KEYS.syncApiKey);
    if (!token) {
        await requestBridgeFromOpenCacheTab();
        const afterBridge = await chrome.storage.local.get([
            STORAGE_KEYS.syncApiKey,
        ]);
        token = readTrimmedStorageString(afterBridge, STORAGE_KEYS.syncApiKey);
    }
    if (!token) {
        setActionButtonsDisabled(true);
        setOpenCacheVisible(true);
        setStatus(
            `Sign in to Cache and keep a ${cacheHostLabel(appOrigin)} tab open, then reopen this popup.`,
            "error"
        );
        return false;
    }

    setActionButtonsDisabled(false);
    setOpenCacheVisible(false);
    if (statusEl && !statusEl.classList.contains("error")) {
        statusEl.textContent = "";
    }
    return true;
}

function handleProgressMessage(msg) {
    setStatus(`Syncing ${sourceLabel(msg.activeSource)}…`, "idle");
}

function handleDoneMessage(msg) {
    setStatus(`Done. ${sourceLabel(msg.completedSource)} updated.`, "ok");
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === MESSAGE_TYPES.SYNC_PROGRESS) {
        handleProgressMessage(msg);
        void refreshFromStorage();
    }
    if (msg?.type === MESSAGE_TYPES.SYNC_DONE) {
        handleDoneMessage(msg);
        setActionButtonsDisabled(false);
        void refreshFromStorage();
        void applyCacheSessionGate();
    }
    if (msg?.type === MESSAGE_TYPES.SYNC_ERROR) {
        setStatus(
            formatErrorMessage(
                typeof msg.code === "string" ? msg.code : "UNKNOWN",
                typeof msg.message === "string" ? msg.message : undefined
            ),
            "error"
        );
        setActionButtonsDisabled(false);
        void refreshFromStorage();
    }
});

syncBtn?.addEventListener("click", async () => {
    const linked = await applyCacheSessionGate();
    if (!linked || syncBtn?.disabled) {
        return;
    }

    setStatus("Syncing current tab…", "idle");
    syncBtn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!tab?.id) {
            throw new Error("No active tab.");
        }
        const url = tab.url ?? "";
        if (
            !(
                url.startsWith("https://www.instagram.com/") ||
                url.startsWith("https://www.tiktok.com/") ||
                isYouTubeWatchLaterUrl(url)
            )
        ) {
            throw new Error(
                "Open Instagram Saved, TikTok Favorites, or YouTube Watch Later in this tab."
            );
        }

        await chrome.tabs.sendMessage(tab.id, {
            type: MESSAGE_TYPES.START_SYNC,
        });
    } catch (error) {
        setStatus(
            error instanceof Error
                ? error.message
                : "Could not reach this page. Reload the tab and try again.",
            "error"
        );
        syncBtn.disabled = false;
        await applyCacheSessionGate();
    }
});

chromeSyncBtn?.addEventListener("click", async () => {
    const linked = await applyCacheSessionGate();
    if (!linked || chromeSyncBtn?.disabled) {
        return;
    }

    const mode = CHROME_SYNC_MODES.oneTimeImport;

    setStatus("Importing Chrome bookmarks…", "idle");
    chromeSyncBtn.disabled = true;

    try {
        await chrome.runtime.sendMessage({
            mode,
            type: MESSAGE_TYPES.SYNC_CHROME_BOOKMARKS,
        });
    } catch (error) {
        setStatus(
            error instanceof Error
                ? error.message
                : "Chrome bookmarks could not be synced right now.",
            "error"
        );
        chromeSyncBtn.disabled = false;
        await applyCacheSessionGate();
    }
});

chromeContinuousEl?.addEventListener("change", async () => {
    const enabled = chromeContinuousEl.checked;
    await chrome.runtime.sendMessage({
        enabled,
        type: MESSAGE_TYPES.TOGGLE_CHROME_SYNC,
    });
    void refreshFromStorage();
});

openCacheBtnEl?.addEventListener("click", async () => {
    const keyData = await chrome.storage.local.get([STORAGE_KEYS.syncEndpoint]);
    const endpoint = readTrimmedStorageString(
        keyData,
        STORAGE_KEYS.syncEndpoint
    );
    const originToOpen = resolveCacheOrigin(endpoint);

    if (!originToOpen) {
        return;
    }

    await chrome.tabs.create({
        url: `${originToOpen}/${CACHE_APP_DEFAULT_LOCALE}`,
    });
});

window.addEventListener("focus", () => {
    void applyCacheSessionGate();
    void refreshFromStorage();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") {
        return;
    }
    if (
        changes[STORAGE_KEYS.syncApiKey] ||
        changes[STORAGE_KEYS.syncEndpoint] ||
        changes[STORAGE_KEYS.chromeSyncEnabled] ||
        changes[STORAGE_KEYS.chromeLastSyncAt] ||
        changes[STORAGE_KEYS.chromePendingEvents]
    ) {
        void applyCacheSessionGate();
        void refreshFromStorage();
    }
});

void refreshFromStorage();
void applyCacheSessionGate();
