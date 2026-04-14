/** Runs only on Cache app pages (see manifest `matches`). */
(function runCacheSiteBootstrap() {
    const origin = window.location.origin;
    const TOKEN_MESSAGE_TYPE = "CACHE_SITE_TOKEN";
    const BRIDGE_REQUEST_TYPE = "CACHE_SITE_BRIDGE_REQUEST";
    const READY_EVENT_TYPE = "CACHE_EXTENSION_READY";

    function announceExtensionReady() {
        try {
            document.documentElement.dataset.cacheExtensionInstalled = "true";
            window.postMessage(
                { type: READY_EVENT_TYPE },
                window.location.origin,
            );
            window.dispatchEvent(new CustomEvent(READY_EVENT_TYPE));
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
                if (data.type !== TOKEN_MESSAGE_TYPE) {
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
        const endpoint = `${origin}/api/integrations/instagram/saved`;
        try {
            await chrome.runtime.sendMessage({
                endpoint,
                token,
                type: "CACHE_SITE_BRIDGE",
            });
            return true;
        } catch (err) {
            console.warn("[Cache App] extension site bridge send failed:", err);
            return false;
        }
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type !== BRIDGE_REQUEST_TYPE) {
            return false;
        }
        void bridgeTokenToExtension().then((ok) => sendResponse({ ok }));
        return true;
    });

    announceExtensionReady();

    // Passive auto-link on normal page load.
    void bridgeTokenToExtension();
})();
