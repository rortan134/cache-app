import { BASE_URL } from "@/lib/common/constants";
import { getDefaultLocale, getGTClass, getLocales } from "gt-next/server";
import type { Metadata } from "next";

function getLocalizedUrl(locale: string, path: `/${string}`) {
    return path === "/"
        ? `${BASE_URL}/${locale}`
        : `${BASE_URL}/${locale}${path}`;
}

export function buildLocaleAlternates(
    path: `/${string}`
): NonNullable<Metadata["alternates"]> {
    const gt = getGTClass();
    const defaultLocale = getDefaultLocale();
    const languages = Object.fromEntries(
        getLocales().map((locale) => [
            gt.resolveCanonicalLocale(locale),
            getLocalizedUrl(locale, path),
        ])
    );

    const canonical = getLocalizedUrl(defaultLocale, path);

    return {
        canonical,
        languages: {
            ...languages,
            "x-default": path === "/" ? BASE_URL : canonical,
        },
    };
}
