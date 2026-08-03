import { BASE_URL } from "@/lib/common/constants";

export function getLocalizedUrl(locale: string, path: `/${string}`): string {
    return path === "/"
        ? `${BASE_URL}/${locale}`
        : `${BASE_URL}/${locale}${path}`;
}
