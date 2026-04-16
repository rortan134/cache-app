export function setItem<T>(key: string, data: T, session?: boolean): void {
    if (typeof window !== "undefined" && data) {
        (session ? sessionStorage : localStorage).setItem(
            key,
            JSON.stringify(data)
        );
    }
}

export function getItem<T>(key: string, session?: boolean): T | null {
    if (typeof window !== "undefined") {
        const value = (session ? sessionStorage : localStorage).getItem(key);

        if (value !== "undefined" && value !== null) {
            try {
                return JSON.parse(value) as T;
            } catch {
                return null;
            }
        }
    }
    return null;
}

export function removeItem(key: string, session?: boolean): void {
    if (typeof window !== "undefined") {
        (session ? sessionStorage : localStorage).removeItem(key);
    }
}

const TRAILING_SLASHES = /\/+$/;
const LEADING_SLASHES = /^\/+/;

type StorageEnvironment = "cachd/app" | "statsig" | "cache";

export function buildStorageKey(
    key: string,
    environment: StorageEnvironment = "cachd/app"
): string {
    const env = environment.replace(TRAILING_SLASHES, "");
    const k = key.replace(LEADING_SLASHES, "");
    return `${env}/${k}`;
}
