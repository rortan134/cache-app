import { FALLBACK_URL } from "@/lib/common/constants";
import { sanitizeUrl } from "@braintree/sanitize-url";

const URL_WHITESPACE_RE = /\s/;
const URL_ONLY_PROTOCOLS = new Set(["http:", "https:"]);
const PROTOCOL_PREFIX_RE = /^[a-zA-Z]+:\/\//;

export const parseValidUrl = (url: string): URL | null => {
    try {
        return new URL(url);
    } catch {
        return null;
    }
};

export const normalizeURL = (link: string | null | undefined) => {
    if (typeof link !== "string") {
        return FALLBACK_URL;
    }
    const trimmed = link.trim();
    return trimmed ? sanitizeUrl(trimmed) : trimmed;
};

export function getSafeOrigin() {
    if (typeof window === "undefined") {
        return null;
    }
    const origin = window.location.origin;
    return origin === "null" ? null : origin;
}

const toUrl = (link: string): URL | null => {
    const trimmed = link.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith("/")) {
        const origin = getSafeOrigin();
        if (typeof origin !== "string") {
            return null;
        }
        return parseValidUrl(`${origin}${trimmed}`);
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return parseValidUrl(normalizeURL(trimmed));
    }

    if (trimmed.includes("://")) {
        const replaced = trimmed.replace(PROTOCOL_PREFIX_RE, "");
        return parseValidUrl(normalizeURL(replaced));
    }

    return parseValidUrl(normalizeURL(`https://${trimmed}`));
};

export const toValidUrl = (link: string): string =>
    toUrl(link)?.href ?? FALLBACK_URL;

export const parseStandaloneUrl = (input: string): URL | null => {
    const trimmedInput = input.trim();

    if (trimmedInput.length === 0 || URL_WHITESPACE_RE.test(trimmedInput)) {
        return null;
    }

    const url = toUrl(trimmedInput);
    if (!(url && URL_ONLY_PROTOCOLS.has(url.protocol))) {
        return null;
    }

    return url;
};

export const isLocalUrl = (link: string | null) => {
    if (!link) {
        return false;
    }
    if (link.startsWith("/")) {
        return true;
    }
    if (typeof location !== "undefined") {
        try {
            const parsed = new URL(link);
            return parsed.origin === location.origin;
        } catch {
            return false;
        }
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
            if (value) {
                paramsObj[key] = value;
            }
        }
        return paramsObj;
    } catch {
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

export function openExternal(url: string) {
    if (typeof window === "undefined") {
        return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
}
