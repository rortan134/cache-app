import { getErrorMessage } from "@/lib/common/error";
import { withRetry } from "@/lib/common/retry";
import { PickerNotReadyError } from "./error";

interface SessionCreateResponse {
    error?: string;
    pickerUri: string | null;
    pollIntervalMs: number;
    sessionId: string;
    timeoutIn: string | null;
}

interface SessionPollResponse {
    error?: string;
    mediaItemsSet: boolean;
    pollIntervalMs: number;
}

interface ImportResponse {
    error?: string;
    importedCount: number;
}

function parseDurationMs(value: string | null): number | null {
    if (!value?.endsWith("s")) {
        return null;
    }

    const seconds = Number(value.slice(0, -1));
    return Number.isNaN(seconds) ? null : Math.round(seconds * 1000);
}

async function createPickerSessionRequest(): Promise<SessionCreateResponse> {
    const response = await fetch("/api/google-photos/picker/session", {
        method: "POST",
    });
    const payload = (await response.json()) as
        | SessionCreateResponse
        | { error: string };

    if (!(response.ok && "sessionId" in payload)) {
        throw new Error(
            getErrorMessage(
                payload,
                "Could not start Google Photos Picker. Please reconnect Google and try again."
            )
        );
    }

    return payload;
}

async function pollUntilMediaSelected(
    sessionId: string,
    timeoutIn: string | null
): Promise<void> {
    const startedAt = Date.now();
    const timeoutMs = parseDurationMs(timeoutIn) ?? 5 * 60_000;

    await withRetry(
        async () => {
            if (Date.now() - startedAt >= timeoutMs) {
                throw new Error(
                    "Selection timed out. Open the picker again and confirm your media."
                );
            }

            const response = await fetch(
                `/api/google-photos/picker/session?id=${encodeURIComponent(sessionId)}`,
                { method: "GET" }
            );
            const payload = (await response.json()) as
                | SessionPollResponse
                | { error: string };

            if (!(response.ok && "mediaItemsSet" in payload)) {
                throw new Error(
                    getErrorMessage(
                        payload,
                        "Could not read picker status. Please try again."
                    )
                );
            }

            if (payload.mediaItemsSet) {
                return;
            }

            throw new PickerNotReadyError({
                pollIntervalMs: payload.pollIntervalMs,
            });
        },
        {
            attempts: Number.MAX_SAFE_INTEGER,
            delayMs: (_, err) =>
                err instanceof PickerNotReadyError
                    ? Math.max(1000, err.data.pollIntervalMs)
                    : 1000,
            shouldRetry: (err) => err instanceof PickerNotReadyError,
        }
    );
}

async function importSelectedMedia(sessionId: string): Promise<ImportResponse> {
    const response = await fetch("/api/google-photos/picker/import", {
        body: JSON.stringify({ sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    });
    const payload = (await response.json()) as
        | ImportResponse
        | { error: string };

    if (!(response.ok && "importedCount" in payload)) {
        throw new Error(
            getErrorMessage(
                payload,
                "Import failed. Ensure Photos permission is granted, then try again."
            )
        );
    }

    return payload;
}

/**
 * Executes the full Google Photos Picker flow: session creation, polling for selection, and import.
 *
 * @returns A success message with the number of imported items.
 */
export async function executeGooglePhotosPickerFlow(): Promise<string> {
    const createPayload = await createPickerSessionRequest();

    if (!createPayload.pickerUri) {
        throw new Error("Picker URL is missing. Please try again.");
    }

    window.open(createPayload.pickerUri, "_blank", "noopener,noreferrer");
    await pollUntilMediaSelected(
        createPayload.sessionId,
        createPayload.timeoutIn
    );
    const importPayload = await importSelectedMedia(createPayload.sessionId);

    return `Imported ${importPayload.importedCount} item${importPayload.importedCount === 1 ? "" : "s"}.`;
}
