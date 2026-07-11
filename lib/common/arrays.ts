export function chunk<T>(items: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

export function removeValue<T>(values: T[], value: T): T[] {
    return values.filter((entry) => entry !== value);
}

export function toggleValue<T>(values: T[], next: T): T[] {
    return values.includes(next)
        ? values.filter((entry) => entry !== next)
        : [...values, next];
}

export function updateById<T extends { id: string }>(
    items: T[],
    id: string,
    updater: (item: T) => T
): T[] {
    return items.map((item) => (item.id === id ? updater(item) : item));
}

export function addUnique<T>(values: T[], value: T): T[] {
    return values.includes(value) ? values : [...values, value];
}

export async function mapConcurrent<T, R>(
    items: readonly T[],
    fn: (item: T) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    if (items.length === 0) {
        return [];
    }

    const concurrencyLimit = Number.isFinite(concurrency)
        ? Math.floor(concurrency)
        : 1;
    const limit = Math.max(1, concurrencyLimit);
    const results = new Array<R>(items.length);
    // Shared iterator: each worker pulls the next entry. Entries preserve T
    // under noUncheckedIndexedAccess (unlike items[i]), and undefined slots
    // still reach fn instead of retiring the worker early.
    const iterator = items.entries();
    // Capture the first rejection, stop scheduling new work, and let in-flight
    // calls finish so sibling workers never produce unhandled rejections.
    let hasRejected = false;
    let firstError: unknown;

    async function worker(): Promise<void> {
        for (;;) {
            if (hasRejected) {
                return;
            }
            const next = iterator.next();
            if (next.done) {
                return;
            }
            const [index, item] = next.value;
            try {
                results[index] = await fn(item);
            } catch (error) {
                if (!hasRejected) {
                    hasRejected = true;
                    firstError = error;
                }
                return;
            }
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, () => worker())
    );
    if (hasRejected) {
        throw firstError;
    }
    return results;
}
