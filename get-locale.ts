import gtConfig from "./gt.config.json";
import { locale } from "next/root-params";

export default async function getLocale() {
    const l = await locale();

    if (l && gtConfig.locales.includes(l)) {
        return l;
    }

    return gtConfig.defaultLocale;
}
