import {
    buildPublicSitemapEntries,
    renderSitemapXml,
} from "@/lib/marketing/site-map";
import { getDefaultLocale, getLocales } from "gt-next";

export function GET(): Response {
    const sitemap = renderSitemapXml(
        buildPublicSitemapEntries(getDefaultLocale(), getLocales())
    );

    return new Response(sitemap, {
        headers: {
            "Cache-Control":
                "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
            "Content-Type": "text/xml; charset=utf-8",
            Vary: "Accept",
        },
    });
}
