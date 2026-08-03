import { getDefaultLocale, getLocales } from "gt-next";

import {
    getLocalizedUrl,
    PUBLIC_STATIC_ROUTES,
} from "@/lib/marketing/site-map";

const MARKDOWN_SITEMAP_HEADER = `# Cache sitemap

Public pages and agent resources for Cache. The canonical page URLs below return Markdown when requested with \`Accept: text/markdown\`.

## Public pages
`;

export function GET(): Response {
    const defaultLocale = getDefaultLocale();
    const locales = getLocales();
    const pages = PUBLIC_STATIC_ROUTES.map((route) => {
        const defaultUrl = getLocalizedUrl(defaultLocale, route.path);
        const alternateLocales = locales
            .filter((locale) => locale !== defaultLocale)
            .map(
                (locale) =>
                    `  - [${route.title} (${locale})](${getLocalizedUrl(locale, route.path)})`
            );

        return [
            `- [${route.title}](${defaultUrl}) — ${route.description}`,
            ...alternateLocales,
        ].join("\n");
    }).join("\n");

    const sitemap = `${MARKDOWN_SITEMAP_HEADER}\n${pages}\n\n## Agent resources\n\n- [Full agent context](/llms.txt)\n- [MCP server endpoint](/mcp)\n`;

    return new Response(sitemap, {
        headers: {
            "Cache-Control":
                "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
            "Content-Type": "text/markdown; charset=utf-8",
            Vary: "Accept",
        },
    });
}
