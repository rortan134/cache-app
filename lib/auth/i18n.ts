import { localization, type BuiltInLocales } from "better-auth-localization";

const LOCALE_COOKIE_NAME = "generaltranslation.locale";

export function createi18n() {
    return localization({
        defaultLocale: "default",
        fallbackLocale: "default",
        getLocale: (request) => {
            if (!request) {
                return "default";
            }
            const cookies = request.headers.get("cookie");
            if (!cookies) {
                return "default";
            }
            const match = cookies
                .split("; ")
                .find((c) => c.startsWith(`${LOCALE_COOKIE_NAME}=`));
            if (!match) {
                return "default";
            }
            const locale = match.split("=")[1];
            if (locale === "en-US") {
                return "default";
            }
            return locale as BuiltInLocales;
        },
    });
}
