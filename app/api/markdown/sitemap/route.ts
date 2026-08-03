import { MIME_TYPES } from "@/lib/common/constants";
import { MARKETING_CACHE_CONTROL_HEADER } from "@/lib/marketing/constants";
import { buildPublicSitemapRoutes } from "@/lib/marketing/site-map";
import { getDefaultLocale, getLocales } from "gt-next";

const MARKDOWN_SITEMAP_HEADER = `# Cache sitemap

Public pages and agent resources for Cache. The canonical page URLs below return Markdown when requested with \`Accept: text/markdown\`.

## Public pages
`;

const MARKDOWN_SITEMAP = buildMarkdownSitemap(getDefaultLocale(), getLocales());

export function GET(): Response {
    return new Response(MARKDOWN_SITEMAP, {
        headers: {
            "Cache-Control": MARKETING_CACHE_CONTROL_HEADER,
            "Content-Type": `${MIME_TYPES.markdown}; charset=utf-8`,
            Vary: "Accept",
        },
    });
}

function buildMarkdownSitemap(
    defaultLocale: string,
    locales: readonly string[]
): string {
    const pages = buildPublicSitemapRoutes(defaultLocale, locales)
        .map((route) => {
            const alternateLocales = Object.entries(route.alternates)
                .filter(([locale]) => locale !== defaultLocale)
                .map(
                    ([locale, url]) =>
                        `  - [${route.title} (${locale})](${url})`
                );

            return [
                `- [${route.title}](${route.url}) — ${route.description}`,
                ...alternateLocales,
            ].join("\n");
        })
        .join("\n");

    return `${MARKDOWN_SITEMAP_HEADER}\n${pages}\n\n## Agent resources\n\n- [Full agent context](/llms.txt)\n- [MCP server endpoint](/mcp)\n`;
}
