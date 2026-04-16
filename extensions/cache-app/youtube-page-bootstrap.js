(() => {
    const MESSAGE_TYPE = "CACHE_YT_BOOTSTRAP";

    try {
        const cfg = window.ytcfg || null;
        const get = (key) => {
            try {
                if (cfg && typeof cfg.get === "function") {
                    return cfg.get(key);
                }
                if (cfg && cfg.data_) {
                    return cfg.data_[key];
                }
            } catch (_error) {
                return null;
            }
            return null;
        };

        window.postMessage(
            {
                payload: {
                    apiKey: get("INNERTUBE_API_KEY") || null,
                    clientName: get("INNERTUBE_CONTEXT_CLIENT_NAME") || null,
                    clientVersion:
                        get("INNERTUBE_CONTEXT_CLIENT_VERSION") || null,
                    context: get("INNERTUBE_CONTEXT") || null,
                    initialData: window.ytInitialData || null,
                },
                type: MESSAGE_TYPE,
            },
            window.location.origin
        );
    } catch (_error) {
        window.postMessage(
            {
                payload: null,
                type: MESSAGE_TYPE,
            },
            window.location.origin
        );
    }
})();
