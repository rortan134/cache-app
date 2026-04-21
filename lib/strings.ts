const TRAILING_NUMBER_PATTERN = /^.*(\d+)$/;
const TRAILING_NUMBER_REPLACE_PATTERN = /(\d+)$/;

/**
 * Get an incremented name (e.g. New page (2)) from a name (e.g. New page), based on an array of
 * existing names.
 *
 * @param name - The name to increment.
 * @param others - The array of existing names.
 * @public
 */
export function getIncrementedName(name: string, others: string[]) {
    let result = name;
    const set = new Set(others);

    while (set.has(result)) {
        result = TRAILING_NUMBER_PATTERN.exec(result)?.[1]
            ? result.replace(TRAILING_NUMBER_REPLACE_PATTERN, (m) =>
                  (+m + 1).toString()
              )
            : `${result} 1`;
    }

    return result;
}

export function normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(input: string): string {
    return input
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'");
}

export function normalizeCollectionName(name: string): {
    name: string;
    nameKey: string;
} {
    const normalizedName = normalizeWhitespace(name);
    return {
        name: normalizedName,
        nameKey: normalizedName.toLocaleLowerCase(),
    };
}
