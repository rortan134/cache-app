import { buildPublicSitemapEntries } from "@/lib/marketing/site-map";
import { getDefaultLocale, getLocales } from "gt-next";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    return buildPublicSitemapEntries(getDefaultLocale(), getLocales()).map(
        ({ alternates, ...entry }) => ({
            ...entry,
            alternates: { languages: alternates },
        })
    );
}
