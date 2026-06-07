/** Runs only on Cache app pages (see manifest `matches`). */
(function runCacheSiteBootstrap() {
    const { MESSAGE_TYPES, defaultIngestEndpoint } =
        globalThis.CacheExtensionRuntime;
    const origin = window.location.origin;

    function announceExtensionReady() {
        try {
            document.documentElement.dataset.cacheExtensionInstalled = "true";
            window.postMessage(
                { type: MESSAGE_TYPES.CACHE_EXTENSION_READY },
                window.location.origin
            );
            window.dispatchEvent(
                new CustomEvent(MESSAGE_TYPES.CACHE_EXTENSION_READY)
            );
        } catch {}
    }

    /**
     * @returns {Promise<string>}
     */
    async function fetchTokenFromContentScriptWorld() {
        const res = await fetch(`${origin}/api/user/extension-ingest-token`, {
            credentials: "include",
        });
        if (!res.ok) {
            return "";
        }
        const data = await res.json().catch(() => null);
        return data && typeof data.token === "string" ? data.token : "";
    }

    /**
     * @returns {Promise<string>}
     */
    async function fetchTokenViaPageWorld() {
        return new Promise((resolve) => {
            /** @param {MessageEvent} event */
            function once(event) {
                if (event.source !== window) {
                    return;
                }
                const data = event.data;
                if (!data || typeof data !== "object") {
                    return;
                }
                if (data.type !== MESSAGE_TYPES.CACHE_SITE_TOKEN) {
                    return;
                }
                window.removeEventListener("message", once);
                const token =
                    typeof data.token === "string" ? data.token.trim() : "";
                resolve(token);
            }

            window.addEventListener("message", once);
            const script = document.createElement("script");
            script.dataset.cacheApp = "site-bridge";
            script.src = chrome.runtime.getURL("cache-site-page-bridge.js");
            script.async = false;
            (
                document.documentElement ||
                document.head ||
                document.body
            ).appendChild(script);
            script.remove();

            setTimeout(() => {
                window.removeEventListener("message", once);
                resolve("");
            }, 1500);
        });
    }

    /**
     * @returns {Promise<boolean>}
     */
    async function bridgeTokenToExtension() {
        let token = "";
        try {
            token = (await fetchTokenFromContentScriptWorld()).trim();
        } catch {
            token = "";
        }
        if (!token) {
            token = (await fetchTokenViaPageWorld()).trim();
        }
        if (!token) {
            return false;
        }
        const endpoint = defaultIngestEndpoint(origin) || origin;
        try {
            await chrome.runtime.sendMessage({
                endpoint,
                token,
                type: MESSAGE_TYPES.CACHE_SITE_BRIDGE,
            });
            return true;
        } catch (err) {
            console.warn("[Cache App] extension site bridge send failed:", err);
            return false;
        }
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type !== MESSAGE_TYPES.CACHE_SITE_BRIDGE_REQUEST) {
            return false;
        }
        void bridgeTokenToExtension().then((ok) => sendResponse({ ok }));
        return true;
    });

    /**
     * The Cache web app dispatches this message when the user clicks the
     * "Open" action for an extension-backed integration (Instagram, TikTok,
     * YouTube). The service worker then opens the target URL in a new tab,
     * starts a sync once the page is ready, and best-effort opens the popup.
     * @param {MessageEvent} event
     */
    function onOpenAndSyncMessage(event) {
        if (event.source !== window) {
            return;
        }
        if (event.origin !== origin) {
            return;
        }
        const data = event.data;
        if (!data || typeof data !== "object") {
            return;
        }
        if (data.type !== MESSAGE_TYPES.CACHE_SITE_OPEN_AND_SYNC) {
            return;
        }
        const openURL =
            typeof data.openURL === "string" ? data.openURL.trim() : "";
        if (!openURL) {
            return;
        }
        void chrome.runtime
            .sendMessage({
                openURL,
                type: MESSAGE_TYPES.CACHE_SITE_OPEN_AND_SYNC,
            })
            .catch((err) => {
                console.warn("[Cache App] open-and-sync forward failed:", err);
            });
    }

    window.addEventListener("message", onOpenAndSyncMessage);

    announceExtensionReady();

    // Passive auto-link on normal page load.
    void bridgeTokenToExtension();
})();
