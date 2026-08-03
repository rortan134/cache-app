import {
    getLocalizedUrl,
    PUBLIC_STATIC_ROUTES,
} from "@/lib/marketing/site-map";
import { getDefaultLocale, getLocales } from "gt-next";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const locales = getLocales();
    const defaultLocale = getDefaultLocale();

    return PUBLIC_STATIC_ROUTES.map((entry) => ({
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
