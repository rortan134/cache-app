const DJB2_HASH_INIT = 5381;

/**
 * Generates a hash for a given string using the DJB2 algorithm.
 * @param value - The string to hash.
 * @returns A non-negative hash value.
 */
export function djb2Hash(value: string): number {
    let hash = DJB2_HASH_INIT;
    const len = value.length;
    for (let i = 0; i < len; i += 1) {
        hash = (hash << 5) + hash + value.charCodeAt(i);
        hash |= 0; // Clamp to a signed 32-bit integer
    }
    return Math.abs(hash);
}
