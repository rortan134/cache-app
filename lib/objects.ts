export function pickFirstKey<T extends object>(obj: T): keyof T {
    return Object.keys(obj)[0] as keyof T;
}

export function denyPropertyAccess<T extends object>() {
    return new Proxy<T>(Object.create(null), {
        get: (_target, prop) => {
            throw new Error(
                `You are trying to access a property that is not accessible: ${String(prop)}`
            );
        },
    });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isObject(item: object) {
    return item && typeof item === "object" && !Array.isArray(item);
}
