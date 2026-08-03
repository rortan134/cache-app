import { BASE_URL } from "@/lib/common/constants";
import { normalizeURL } from "@/lib/common/url";

export interface PublicStaticRoute {
    description: string;
    path: `/${string}`;
    priority: number;
    title: string;
}

export interface PublicSitemapEntry {
    alternates: Readonly<Record<string, string>>;
    changeFrequency: "weekly";
    lastModified: Date;
    priority: number;
    url: string;
}

export const PUBLIC_STATIC_ROUTES = [
    {
        description:
            "The AI bookmark manager for busy people. View, manage, and organize bookmarks across platforms.",
        path: "/",
        priority: 1,
        title: "Cache — the AI bookmark manager",
    },
    {
        description: "Browse and search your saved bookmarks and notes.",
        path: "/library",
        priority: 0.85,
        title: "Library",
    },
    {
        description: "The latest product updates from Cache.",
        path: "/changelog",
        priority: 0.7,
        title: "Changelog",
    },
    {
        description: "Security information and documentation for Cache.",
        path: "/security",
        priority: 0.7,
        title: "Security",
    },
    {
        description: "Legal documents and policies for Cache.",
        path: "/legal",
        priority: 0.7,
        title: "Legal",
    },
    {
        description: "Cache terms of service.",
        path: "/legal/terms-of-service",
        priority: 0.7,
        title: "Terms of Service",
    },
    {
        description: "Cache privacy policy.",
        path: "/legal/privacy-policy",
        priority: 0.7,
        title: "Privacy Policy",
    },
] satisfies readonly PublicStaticRoute[];

export function getLocalizedUrl(
    locale: string,
    path: PublicStaticRoute["path"]
): string {
    return normalizeURL(
        path === "/" ? `${BASE_URL}/${locale}` : `${BASE_URL}/${locale}${path}`
    );
}

export function buildPublicSitemapEntries(
    defaultLocale: string,
    locales: readonly string[]
): PublicSitemapEntry[] {
    const lastModified = new Date();

    return PUBLIC_STATIC_ROUTES.map((entry) => ({
        alternates: Object.fromEntries(
            locales.map((locale) => [
                locale,
                getLocalizedUrl(locale, entry.path),
            ])
        ),
        changeFrequency: "weekly" as const,
        lastModified,
        priority: entry.priority,
        url: getLocalizedUrl(defaultLocale, entry.path),
    }));
}

export function renderSitemapXml(
    entries: readonly PublicSitemapEntry[]
): string {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...entries.map((entry) =>
            [
                "  <url>",
                `    <loc>${escapeXml(entry.url)}</loc>`,
                `    <lastmod>${entry.lastModified.toISOString()}</lastmod>`,
                `    <changefreq>${entry.changeFrequency}</changefreq>`,
                `    <priority>${entry.priority}</priority>`,
                ...Object.entries(entry.alternates).map(
                    ([locale, url]) =>
                        `    <xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${escapeXml(url)}" />`
                ),
                "  </url>",
            ].join("\n")
        ),
        "</urlset>",
        "",
    ].join("\n");
}

function escapeXml(value: string): string {
    return value.replace(
        /[&<>"']/g,
        (character) =>
            ({
                "'": "&apos;",
                '"': "&quot;",
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
            })[character] ?? character
    );
}
