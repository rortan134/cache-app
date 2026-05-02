import { sanitizeUrl } from "@braintree/sanitize-url";

const URL_ONLY_WHITESPACE = /\s/;
const URL_ONLY_PROTOCOLS = new Set(["http:", "https:"]);

export const parseValidUrl = (url: string): URL | null => {
    try {
        return new URL(url);
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const normalizeURL = (link: string | null | undefined) => {
    if (typeof link !== "string") {
        return "about:blank";
    }
    const trimmed = link.trim();
    return trimmed ? sanitizeUrl(trimmed) : trimmed;
};

function getSafeOrigin() {
    if (typeof window === "undefined") {
        return null;
    }

    const origin = window.location.origin;
    return origin === "null" ? null : origin;
}

const protocolsRegex = /^[a-zA-Z]+:\/\//;

export const toValidUrl = (link: string) => {
    const trimmed = link.trim();
    if (!trimmed) {
        return "about:blank";
    }

    // Transform relative links to absolute urls
    if (trimmed.startsWith("/")) {
        const origin = getSafeOrigin();
        if (typeof origin !== "string") {
            return "about:blank";
        }
        return parseValidUrl(`${origin}${trimmed}`)?.href ?? "about:blank";
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const normalized = normalizeURL(trimmed);
        return parseValidUrl(normalized)?.href ?? "about:blank";
    }

    if (trimmed.includes("://")) {
        const replaced = trimmed.replace(protocolsRegex, "");
        const normalized = normalizeURL(replaced);
        return parseValidUrl(normalized)?.href ?? "about:blank";
    }

    const normalized = normalizeURL(`https://${trimmed}`);
    return parseValidUrl(normalized)?.href ?? "about:blank";
};

export const parseStandaloneUrl = (input: string): URL | null => {
    const trimmedInput = input.trim();

    if (trimmedInput.length === 0 || URL_ONLY_WHITESPACE.test(trimmedInput)) {
        return null;
    }

    const normalizedUrl = toValidUrl(trimmedInput);
    if (normalizedUrl === "about:blank") {
        return null;
    }

    const parsedUrl = parseValidUrl(normalizedUrl);
    if (!(parsedUrl && URL_ONLY_PROTOCOLS.has(parsedUrl.protocol))) {
        return null;
    }

    return parsedUrl;
};

export const isLocalUrl = (link: string | null) => {
    if (!link) {
        return false;
    }
    if (link.startsWith("/")) {
        return true;
    }
    if (typeof location !== "undefined") {
        return link.includes(location.origin);
    }
    return false;
};

export const parseUrlSearchParams = (url: string) => {
    if (!url) {
        return {};
    }
    try {
        const params = new URL(url).searchParams;
        const paramsObj: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
            if (value && value !== "") {
                paramsObj[key] = value;
            }
        }
        return paramsObj;
    } catch (error) {
        console.error(error);
        return {};
    }
};

const WWW_REG = /^www\./i;

export const parseDisplayUrl = (url: string): string => {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(WWW_REG, "") || parsed.hostname;
    } catch {
        return url;
    }
};

export function isHttpUrl(value: string | null | undefined): value is string {
    if (!value) {
        return false;
    }

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function openSavedItemInNewTab(url: string) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        if (typeof window.openai !== "undefined") {
            window.openai.openExternal({ href: url });
            return;
        }
    } catch {
        // Fall back to a regular browser tab when the desktop bridge is unavailable.
    }
    window.open(url, "_blank", "noopener,noreferrer");
}
