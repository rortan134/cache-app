/** biome-ignore-all lint/suspicious/noExplicitAny: any */
const isFunction = <
    T extends (...args: any[]) => any = (...args: any[]) => any,
>(
    v: unknown
): v is T => typeof v === "function";

export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
    !!x && isFunction((x as any).then);
