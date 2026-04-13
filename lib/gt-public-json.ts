/**
 * Sync lookup into `public/_gt/*.json` for route metadata (avoids runtime `readFile` under PPR).
 * When `gt translate` adds a new `{locale}.json`, import it and add one entry in `bundles`.
 */
import deDE from "../public/_gt/de-DE.json";
import es419 from "../public/_gt/es-419.json";
import frFR from "../public/_gt/fr-FR.json";
import ptBR from "../public/_gt/pt-BR.json";
import zhCN from "../public/_gt/zh-CN.json";

/** GT locale files mix named keys (e.g. `home.metadata.title`) with hashed JSX entries. */
type GtBundleJson = Record<string, unknown>;

const bundles: Partial<Record<string, GtBundleJson>> = {
    "de-DE": deDE as GtBundleJson,
    "es-419": es419 as GtBundleJson,
    "fr-FR": frFR as GtBundleJson,
    "pt-BR": ptBR as GtBundleJson,
    "zh-CN": zhCN as GtBundleJson,
};

export function gtPublicString(
    locale: string,
    key: string,
    fallback: string
): string {
    const value = bundles[locale]?.[key];
    return typeof value === "string" && value.length > 0 ? value : fallback;
}
