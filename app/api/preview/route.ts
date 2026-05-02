import { createLogger } from "@/lib/common/logs/console/logger";
import { isBlockedHostname } from "@/lib/common/net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { toValidUrl } from "@/lib/common/url";
import { preview } from "openlink";

const log = createLogger("api:library:preview");

const CACHE_CONTROL_HEADER = "public, max-age=86400, s-maxage=604800";
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const USER_AGENT =
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const RESPONSE_NOT_FOUND = new Response("Preview not found", { status: 404 });
const RESPONSE_UNSUPPORTED = new Response("Unsupported preview", {
    status: 415,
});
const RESPONSE_INVALID_URL = new Response("Invalid URL", { status: 400 });
const RESPONSE_TOO_MANY_REDIRECTS = new Response("Too many redirects", {
    status: 508,
});

export async function GET(request: Request): Promise<Response> {
    const targetUrl = extractTargetUrl(request.url);
    if (!targetUrl) {
        return RESPONSE_INVALID_URL;
    }

    try {
        const page = await preview(targetUrl, {
            fetch: fetchHtmlPage,
            headers: {
                Accept: "text/html,application/xhtml+xml",
                "User-Agent": USER_AGENT,
            },
            includeOembed: true,
            timeout: FETCH_TIMEOUT_MS,
        });

        const imageUrl = toSafeUrl(page.image);
        if (!imageUrl) {
            return RESPONSE_NOT_FOUND;
        }

        const pageUrl = toSafeUrl(page.url) ?? targetUrl;
        const imageResponse = await fetchWithRedirects(imageUrl, {
            headers: {
                Accept: "image/*",
                Referer: pageUrl,
                "User-Agent": USER_AGENT,
            },
        });

        if (!imageResponse.ok) {
            return RESPONSE_NOT_FOUND;
        }

        const imageContentType =
            imageResponse.headers.get("content-type") ?? "";
        if (!imageContentType.startsWith("image/")) {
            return RESPONSE_UNSUPPORTED;
        }

        return new Response(imageResponse.body, {
            headers: {
                "cache-control": CACHE_CONTROL_HEADER,
                "content-type": imageContentType,
            },
            status: 200,
        });
    } catch (error) {
        log.warn("Failed to resolve Open Graph image", {
            error: error instanceof Error ? error.message : String(error),
            targetUrl,
        });

        return RESPONSE_NOT_FOUND;
    }
}

const fetchHtmlPage: typeof fetch = async (input, init) => {
    const requestUrl = extractFetchUrl(input);
    if (!requestUrl) {
        return RESPONSE_INVALID_URL;
    }

    const response = await fetchWithRedirects(requestUrl, { ...init });
    const responseUrl = toSafeUrl(response.url || requestUrl);
    if (!responseUrl) {
        return RESPONSE_INVALID_URL;
    }

    if (!response.ok) {
        return response;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
        return new Response("Unsupported content", { status: 415 });
    }

    return response;
};

async function fetchWithRedirects(
    initialUrl: string,
    init: RequestInit
): Promise<Response> {
    let requestUrl = initialUrl;

    for (
        let redirectCount = 0;
        redirectCount <= MAX_REDIRECTS;
        redirectCount++
    ) {
        const response = await fetchWithTimeout(
            requestUrl,
            { ...init, redirect: "manual" },
            FETCH_TIMEOUT_MS
        );

        if (!isRedirectStatus(response.status)) {
            return response;
        }

        const location = response.headers.get("location");
        if (!location) {
            return response;
        }

        const redirectUrl = resolveRedirectUrl(location, requestUrl);
        if (!redirectUrl) {
            return RESPONSE_INVALID_URL;
        }

        requestUrl = redirectUrl;
    }

    return RESPONSE_TOO_MANY_REDIRECTS;
}

function extractFetchUrl(input: RequestInfo | URL): string | null {
    let rawUrl: string;
    if (typeof input === "string") {
        rawUrl = input;
    } else if (input instanceof URL) {
        rawUrl = input.href;
    } else {
        rawUrl = input.url;
    }
    return toSafeUrl(rawUrl);
}

function resolveRedirectUrl(location: string, baseUrl: string): string | null {
    try {
        return toSafeUrl(new URL(location, baseUrl).href);
    } catch {
        return null;
    }
}

function extractTargetUrl(requestUrl: string): string | null {
    const rawUrl = new URL(requestUrl).searchParams.get("url")?.trim();
    if (!rawUrl) {
        return null;
    }

    const normalizedUrl = toValidUrl(rawUrl);
    if (normalizedUrl === "about:blank") {
        return null;
    }

    return toSafeUrl(normalizedUrl);
}

function toSafeUrl(rawUrl: string): string | null {
    try {
        const parsedUrl = new URL(rawUrl);
        if (!isSupportedProtocol(parsedUrl.protocol)) {
            return null;
        }

        if (isBlockedHostname(parsedUrl.hostname)) {
            return null;
        }

        return parsedUrl.href;
    } catch {
        return null;
    }
}

function isSupportedProtocol(protocol: string): boolean {
    return protocol === "http:" || protocol === "https:";
}

function isRedirectStatus(status: number): boolean {
    return status >= 300 && status < 400;
}
