import { BASE_URL } from "@/lib/common/constants";
import { normalizeURL } from "@/lib/common/url";
import { getDefaultLocale, getLocales } from "gt-next/server";
import type { MetadataRoute } from "next";
import { versusEntries } from "./[locale]/versus/data";

interface SitemapRoute {
    path: `/${string}`;
    priority: number;
}

/**
 * Public static routes that do not require authentication.
 * Authenticated-only routes (e.g. /library) are intentionally excluded
 * because they redirect anonymous users and should not be indexed.
 */
const PUBLIC_STATIC_ROUTES = [
    { path: "/", priority: 1 },
    { path: "/versus", priority: 0.85 },
    { path: "/changelog", priority: 0.7 },
    { path: "/security", priority: 0.7 },
    { path: "/legal", priority: 0.7 },
    { path: "/legal/terms-of-service", priority: 0.7 },
    { path: "/legal/privacy-policy", priority: 0.7 },
    { path: "/legal/cookie-policy", priority: 0.7 },
] satisfies SitemapRoute[];

const VERSUS_DYNAMIC_ROUTES = versusEntries.map((entry) => ({
    path: `/versus/${entry.slug}` as const,
    priority: 0.75,
})) satisfies SitemapRoute[];

function getLocalizedUrl(locale: string, path: SitemapRoute["path"]) {
    return normalizeURL(
        path === "/" ? `${BASE_URL}/${locale}` : `${BASE_URL}/${locale}${path}`
    );
}

export default function sitemap(): MetadataRoute.Sitemap {
    const locales = getLocales();
    const defaultLocale = getDefaultLocale();

    return [...PUBLIC_STATIC_ROUTES, ...VERSUS_DYNAMIC_ROUTES].map((entry) => ({
        alternates: {
            languages: Object.fromEntries(
                locales.map((locale) => [
                    locale,
                    getLocalizedUrl(locale, entry.path),
                ])
            ),
        },
        changeFrequency: "weekly",
        lastModified: new Date(),
        priority: entry.priority,
        url: getLocalizedUrl(defaultLocale, entry.path),
    }));
}
