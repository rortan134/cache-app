import { DEFAULT_LOCALE } from "@/lib/common/constants";
import { localization, type BuiltInLocales } from "better-auth-localization";

const LOCALE_COOKIE_NAME = "generaltranslation.locale";
const LOCALE_FALLBACK = "default" satisfies BuiltInLocales;

/** App locales that better-auth-localization also ships (excluding DEFAULT → plugin default). */
const BUILT_IN_APP_LOCALES = {
    "es-ES": "es-ES",
} as const satisfies Record<string, BuiltInLocales>;

function readCookieValue(
    cookieHeader: string,
    name: string
): string | undefined {
    const prefix = `${name}=`;
    for (const part of cookieHeader.split(";")) {
        const trimmed = part.trim();
        if (!trimmed.startsWith(prefix)) {
            continue;
        }
        const raw = trimmed.slice(prefix.length);
        if (!raw) {
            return;
        }
        try {
            return decodeURIComponent(raw);
        } catch {
            return raw;
        }
    }
}

/**
 * Maps app locales onto better-auth-localization's built-ins.
 * `en-US` is the plugin default (`"default"`); other supported locales share
 * BCP-47 tags with the localization package (e.g. `es-ES`).
 */
function isBuiltInAppLocale(
    locale: string
): locale is keyof typeof BUILT_IN_APP_LOCALES {
    return Object.hasOwn(BUILT_IN_APP_LOCALES, locale);
}

function toBuiltInLocale(locale: string): BuiltInLocales {
    if (locale === DEFAULT_LOCALE) {
        return LOCALE_FALLBACK;
    }
    if (isBuiltInAppLocale(locale)) {
        return BUILT_IN_APP_LOCALES[locale];
    }
    return LOCALE_FALLBACK;
}

export function i18nPlugin() {
    return localization({
        defaultLocale: LOCALE_FALLBACK,
        fallbackLocale: LOCALE_FALLBACK,
        getLocale: (request) => {
            if (!request) {
                return LOCALE_FALLBACK;
            }
            const cookies = request.headers.get("cookie");
            if (!cookies) {
                return LOCALE_FALLBACK;
            }
            const locale = readCookieValue(cookies, LOCALE_COOKIE_NAME);
            if (!locale) {
                return LOCALE_FALLBACK;
            }
            return toBuiltInLocale(locale);
        },
    });
}
