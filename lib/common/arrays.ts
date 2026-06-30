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
    const batches = chunk(items, concurrency);
    const batchedResults = await Promise.all(
        batches.map((batch) => Promise.all(batch.map((item) => fn(item))))
    );
    return batchedResults.flat();
}
