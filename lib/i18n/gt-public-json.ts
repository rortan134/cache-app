/**
 * Sync lookup into `public/_gt/*.json` for route metadata (avoids runtime `readFile` under PPR).
 * When `gt translate` adds a new `{locale}.json`, import it and add one entry in `bundles`.
 */
import deDE from "../../public/_gt/de-DE.json";
import esES from "../../public/_gt/es-ES.json";
import frFR from "../../public/_gt/fr-FR.json";
import ptBR from "../../public/_gt/pt-BR.json";

/** GT locale files mix named keys (e.g. `home.metadata.title`) with hashed JSX entries. */
const bundles: Partial<Record<string, Record<string, unknown>>> = {
    "de-DE": deDE,
    "es-ES": esES,
    "fr-FR": frFR,
    "pt-BR": ptBR,
};

export function gtPublicString(
    locale: string,
    key: string,
    fallback: string
): string {
    const value = bundles[locale]?.[key];
    return typeof value === "string" && value.length > 0 ? value : fallback;
}
