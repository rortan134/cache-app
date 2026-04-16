import { sanitizeUrl } from "@braintree/sanitize-url";

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
    const origin = window?.location?.origin;
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

export const UTMTags = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
] as const;

export const getUTMParamsFromURL = (url: string) =>
    Object.fromEntries(
        Object.entries(parseUrlSearchParams(url)).filter(([key]) =>
            UTMTags.includes(key as (typeof UTMTags)[number])
        )
    );

export const paramsMetadata = [
    { display: "UTM Source", examples: "google, twitter", key: "utm_source" },
    { display: "UTM Medium", examples: "social, email", key: "utm_medium" },
    { display: "UTM Campaign", examples: "summer sale", key: "utm_campaign" },
    { display: "UTM Term", examples: "blue shoes", key: "utm_term" },
    { display: "UTM Content", examples: "logo link", key: "utm_content" },
    { display: "Referral (ref)", examples: "google, twitter", key: "ref" },
];

export const getUrlWithoutUTMParams = (url: string) => {
    try {
        const newURL = new URL(url);
        for (const param of paramsMetadata) {
            newURL.searchParams.delete(param.key);
        }
        return newURL.toString();
    } catch (error) {
        console.error(error);
        return url;
    }
};
