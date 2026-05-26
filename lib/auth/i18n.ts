import { localization, type BuiltInLocales } from "better-auth-localization";

const LOCALE_COOKIE_NAME = "generaltranslation.locale";
const LOCALE_FALLBACK = "default";

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
            const locale = cookies
                .split("; ")
                .find((c) => c.startsWith(`${LOCALE_COOKIE_NAME}=`))
                ?.split("=")[1];
            if (!locale || locale === "en-US") {
                return LOCALE_FALLBACK;
            }
            return locale as BuiltInLocales;
        },
    });
}
