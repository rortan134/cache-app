import {
    defaultExtensionClipEndpoint,
    defaultExtensionCollectionsEndpoint,
    resolveCacheOrigin,
    STORAGE_KEYS,
} from "~lib/runtime";

export interface ExtensionCollectionDto {
    id: string;
    itemCount: number;
    name: string;
    priority: string;
}

export interface ExtensionClipUserDto {
    email: string;
    image: string | null;
    name: string | null;
}

export interface ListCollectionsResponse {
    collections: ExtensionCollectionDto[];
    ok: true;
    user: ExtensionClipUserDto;
}

export interface CreateCollectionResponse {
    collection: ExtensionCollectionDto;
    ok: true;
}

export interface ClipResponse {
    collectionIds: string[];
    created: boolean;
    itemId: string;
    ok: true;
}

async function readAuth(): Promise<{ endpointOrigin: string; token: string }> {
    const data = await chrome.storage.local.get([
        STORAGE_KEYS.syncApiKey,
        STORAGE_KEYS.syncEndpoint,
    ]);
    const token =
        typeof data[STORAGE_KEYS.syncApiKey] === "string"
            ? data[STORAGE_KEYS.syncApiKey].trim()
            : "";
    const endpoint =
        typeof data[STORAGE_KEYS.syncEndpoint] === "string"
            ? data[STORAGE_KEYS.syncEndpoint]
            : "";
    const endpointOrigin = resolveCacheOrigin(endpoint);
    if (!token) {
        throw new Error(
            "Not linked. Sign in to Cache and open a Cache tab, then reopen this popup."
        );
    }
    if (!endpointOrigin) {
        throw new Error("Missing Cache origin. Check cache-config.js.");
    }
    return { endpointOrigin, token };
}

function isStringError(
    body: unknown,
): body is { error: string } {
    return (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
    );
}

function isFlattenedZodError(
    body: unknown,
): body is {
    error: {
        formErrors: string[];
        fieldErrors: Record<string, string[] | undefined>;
    };
} {
    if (
        typeof body !== "object" ||
        body === null ||
        !("error" in body) ||
        typeof (body as { error: unknown }).error !== "object"
    ) {
        return false;
    }
    const raw = (body as { error: unknown }).error;
    if (raw === null || typeof raw !== "object") {
        return false;
    }
    const err = raw as Record<string, unknown>;
    return (
        Array.isArray(err.formErrors) &&
        typeof err.fieldErrors === "object" &&
        err.fieldErrors !== null
    );
}

function flattenZodError(
    error: {
        formErrors: string[];
        fieldErrors: Record<string, string[] | undefined>;
    },
): string {
    const parts: string[] = [...error.formErrors];
    for (const key of Object.keys(error.fieldErrors)) {
        const fieldMessages = error.fieldErrors[key];
        if (Array.isArray(fieldMessages)) {
            parts.push(...fieldMessages);
        }
    }
    return parts.length > 0 ? parts.join(" ") : "Invalid request.";
}

async function parseError(res: Response): Promise<string> {
    try {
        const body: unknown = await res.json();
        if (isStringError(body)) {
            return body.error;
        }
        if (isFlattenedZodError(body)) {
            return flattenZodError(body.error);
        }
    } catch {
        // fall through
    }
    return `Request failed (${res.status})`;
}

export async function listCollections(): Promise<ListCollectionsResponse> {
    const { endpointOrigin, token } = await readAuth();
    const res = await fetch(defaultExtensionCollectionsEndpoint(endpointOrigin), {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        method: "GET",
    });
    if (!res.ok) {
        throw new Error(await parseError(res));
    }
    return (await res.json()) as ListCollectionsResponse;
}

export async function createCollection(input: {
    description?: string;
    name: string;
}): Promise<CreateCollectionResponse> {
    const { endpointOrigin, token } = await readAuth();
    const res = await fetch(defaultExtensionCollectionsEndpoint(endpointOrigin), {
        body: JSON.stringify(input),
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    if (!res.ok) {
        throw new Error(await parseError(res));
    }
    return (await res.json()) as CreateCollectionResponse;
}

export async function clipPage(input: {
    caption?: string;
    collectionIds: string[];
    url: string;
}): Promise<ClipResponse> {
    const { endpointOrigin, token } = await readAuth();
    const res = await fetch(defaultExtensionClipEndpoint(endpointOrigin), {
        body: JSON.stringify(input),
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        method: "POST",
    });
    if (!res.ok) {
        throw new Error(await parseError(res));
    }
    return (await res.json()) as ClipResponse;
}
