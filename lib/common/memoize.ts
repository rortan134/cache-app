import memoize, { type Options as MemoizeOptions } from "memoize";

export function withMemoize<Args extends readonly unknown[], R>(
    fn: (...args: Args) => R,
    options?: MemoizeOptions<(...args: Args) => R, string>
): (...args: Args) => R;
export function withMemoize<Args extends readonly unknown[], R, K>(
    fn: (...args: Args) => R,
    options: MemoizeOptions<(...args: Args) => R, K>
): (...args: Args) => R;
export function withMemoize<Args extends readonly unknown[], R, K>(
    fn: (...args: Args) => R,
    options?:
        | MemoizeOptions<(...args: Args) => R, K>
        | MemoizeOptions<(...args: Args) => R, string>
) {
    if (options && "cacheKey" in options) {
        return memoize(fn, options as MemoizeOptions<(...args: Args) => R, K>);
    }
    const cacheKey: MemoizeOptions<(...args: Args) => R, string>["cacheKey"] = (
        arguments_
    ) => JSON.stringify(arguments_);
    return memoize(fn, {
        ...(options as MemoizeOptions<(...args: Args) => R, string>),
        cacheKey,
    });
}
