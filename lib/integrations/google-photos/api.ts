import "server-only";

import { IntegrationApiError } from "@/lib/integrations/error";

const GOOGLE_PHOTOS_PICKER_API = "https://photospicker.googleapis.com/v1";
const DURATION_SECONDS_PATTERN = /^(\d+)(\.\d+)?s$/;
const TRAILING_SLASHES_PATTERN = /\/+$/;

interface PickerApiErrorShape {
    error?: {
        code?: number;
        message?: string;
        status?: string;
    };
}

export interface GooglePhotosPickerSession {
    readonly id: string;
    readonly mediaItemsSet?: boolean;
    readonly pickerUri?: string;
    readonly pollingConfig?: {
        readonly pollInterval?: string;
        readonly timeoutIn?: string;
    };
}

export interface GooglePhotosPickedMediaItem {
    readonly createTime?: string;
    readonly id: string;
    readonly mediaFile?: {
        readonly baseUrl?: string;
        readonly filename?: string;
        readonly mimeType?: string;
    };
}

interface GooglePhotosMediaItemsPage {
    readonly mediaItems: readonly GooglePhotosPickedMediaItem[];
    readonly nextPageToken?: string;
}

async function pickerFetch<TResponse>(
    accessToken: string,
    pathname: string,
    init: RequestInit = {}
): Promise<TResponse> {
    const response = await fetch(`${GOOGLE_PHOTOS_PICKER_API}${pathname}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
        },
    });

    if (!response.ok) {
        const maybeJson = (await response
            .json()
            .catch(() => ({}))) as PickerApiErrorShape;
        const apiMessage = maybeJson.error?.message ?? response.statusText;
        throw new IntegrationApiError({
            integrationId: "google-photos",
            message: apiMessage,
            operation: "pickerFetch",
            status: response.status,
        });
    }

    return (await response.json()) as TResponse;
}

export async function createPickerSession(
    accessToken: string
): Promise<GooglePhotosPickerSession> {
    return await pickerFetch<GooglePhotosPickerSession>(
        accessToken,
        "/sessions",
        {
            body: "{}",
            method: "POST",
        }
    );
}

export async function getPickerSession(
    accessToken: string,
    sessionId: string
): Promise<GooglePhotosPickerSession> {
    return await pickerFetch<GooglePhotosPickerSession>(
        accessToken,
        `/sessions/${encodeURIComponent(sessionId)}`
    );
}

export async function deletePickerSession(
    accessToken: string,
    sessionId: string
): Promise<void> {
    await pickerFetch<Record<string, never>>(
        accessToken,
        `/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" }
    );
}

export async function listPickedMediaItems(
    accessToken: string,
    sessionId: string
): Promise<GooglePhotosPickedMediaItem[]> {
    const items: GooglePhotosPickedMediaItem[] = [];
    let nextPageToken: string | undefined;

    do {
        const params = new URLSearchParams({ sessionId });
        if (nextPageToken) {
            params.set("pageToken", nextPageToken);
        }
        const page = await pickerFetch<GooglePhotosMediaItemsPage>(
            accessToken,
            `/mediaItems?${params.toString()}`
        );
        items.push(...page.mediaItems);
        nextPageToken = page.nextPageToken;
    } while (nextPageToken);

    return items;
}

export function withPickerAutoclose(pickerUri: string): string {
    const clean = pickerUri.replace(TRAILING_SLASHES_PATTERN, "");
    return clean.endsWith("/autoclose") ? clean : `${clean}/autoclose`;
}

function parseDurationSeconds(value: string | undefined): number | null {
    if (!value) {
        return null;
    }
    const match = DURATION_SECONDS_PATTERN.exec(value);
    if (!match) {
        return null;
    }
    return Number(match[1]);
}

export function pickerPollIntervalMs(pollInterval: string | undefined): number {
    const seconds = parseDurationSeconds(pollInterval);
    if (!seconds || Number.isNaN(seconds)) {
        return 2000;
    }
    return Math.max(1000, Math.round(seconds * 1000));
}
