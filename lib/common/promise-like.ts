const isFunction = (v: unknown): v is (...args: unknown[]) => unknown =>
    typeof v === "function";

export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
    !!x && isFunction((x as Record<string, unknown>).then);
