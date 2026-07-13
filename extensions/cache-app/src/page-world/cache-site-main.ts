import { MESSAGE_TYPES } from "@/lib/runtime";

const REQUEST_EVENT = "cache-request-site-token";

async function publishToken(): Promise<void> {
    const endpoint = `${window.location.origin}/api/user/extension-ingest-token`;
    try {
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) {
            return;
        }
        const data: unknown = await res.json().catch(() => null);
        const token =
            data &&
            typeof data === "object" &&
            "token" in data &&
            typeof data.token === "string"
                ? data.token.trim()
                : "";
        if (!token) {
            return;
        }
        window.postMessage(
            { token, type: MESSAGE_TYPES.CACHE_SITE_TOKEN },
            window.location.origin,
        );
    } catch {
        /* page may be logged out */
    }
}

document.documentElement.addEventListener(REQUEST_EVENT, () => {
    void publishToken();
});
