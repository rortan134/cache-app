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
    if (typeof link === "string") {
        const newLink = link?.trim();
        if (!newLink) {
            return newLink;
        }
        return sanitizeUrl(newLink);
    }
    return "about:blank";
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
    if (!link?.trim()) {
        return "about:blank";
    }

    let newLink = link;

    // Transform relative links to absolute urls
    if (newLink.startsWith("/")) {
        const origin = getSafeOrigin();
        if (typeof origin === "string") {
            newLink = `${origin}${newLink}`;
        } else {
            return "about:blank";
        }
    }

    if (link.startsWith("http://") || link.startsWith("https://")) {
        newLink = normalizeURL(link);
    } else if (link.includes("://")) {
        // Replace invalid protocol
        const replaced = link.replace(protocolsRegex, "");
        newLink = normalizeURL(replaced);
    } else {
        newLink = normalizeURL(`https://${link}`);
    }

    // if newLink does not parse as URL, assume invalid and return blank page
    return parseValidUrl(newLink)?.href ?? "about:blank";
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

export const isLocalUrl = (link: string | null) =>
    !!(link?.includes(location.origin) ?? link?.startsWith("/"));

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
