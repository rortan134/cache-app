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
