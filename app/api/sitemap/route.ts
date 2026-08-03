import { MIME_TYPES } from "@/lib/common/constants";
import { MARKETING_CACHE_CONTROL_HEADER } from "@/lib/marketing/constants";
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
            "Cache-Control": MARKETING_CACHE_CONTROL_HEADER,
            "Content-Type": `${MIME_TYPES.textXml}; charset=utf-8`,
            Vary: "Accept",
        },
    });
}
