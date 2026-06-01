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
