/**
 * Sync lookup into `public/_gt/*.json` for route metadata (avoids runtime `readFile` under PPR).
 * When `gt translate` adds a new `{locale}.json`, import it and add one entry in `bundles`.
 */
import esES from "../../public/_gt/es-ES.json";

/** GT locale files mix named keys (e.g. `home.metadata.title`) with hashed JSX entries.
 * Only locales whose _gt bundles are committed are imported here (see public/_gt). */
const bundles: Partial<Record<string, Record<string, unknown>>> = {
    "es-ES": esES,
};

export function gtPublicString(
    locale: string,
    key: string,
    fallback: string
): string {
    const value = bundles[locale]?.[key];
    return typeof value === "string" && value.length > 0 ? value : fallback;
}
