(function runCacheSitePageBridge() {
    const TOKEN_MESSAGE_TYPE = "CACHE_SITE_TOKEN";
    const endpoint = `${window.location.origin}/api/user/extension-ingest-token`;

    try {
        void fetch(endpoint, { credentials: "include" })
            .then((res) => {
                if (!res || !res.ok) {
                    return null;
                }
                return res.json().catch(() => null);
            })
            .then((data) => {
                const token =
                    data && typeof data.token === "string" ? data.token.trim() : "";
                if (!token) {
                    return;
                }
                window.postMessage(
                    { type: TOKEN_MESSAGE_TYPE, token },
                    window.location.origin,
                );
            })
            .catch(() => {});
    } catch {}
})();
