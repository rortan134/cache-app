"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { Images } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const { useSession } = authClient;

interface SessionCreateResponse {
    readonly error?: string;
    readonly pickerUri: string | null;
    readonly pollIntervalMs: number;
    readonly sessionId: string;
    readonly timeoutIn: string | null;
}

interface SessionPollResponse {
    readonly error?: string;
    readonly mediaItemsSet: boolean;
    readonly pollIntervalMs: number;
}

interface ImportResponse {
    readonly error?: string;
    readonly importedCount: number;
}

const DURATION_SECONDS_PATTERN = /^(\d+)(\.\d+)?s$/;

function parseDurationMs(value: string | null): number | null {
    if (!value) {
        return null;
    }
    const match = DURATION_SECONDS_PATTERN.exec(value);
    if (!match) {
        return null;
    }
    return Math.round(Number(match[0].slice(0, -1)) * 1000);
}

const sleep = async (ms: number) =>
    await new Promise<void>((resolve) => setTimeout(resolve, ms));

async function createPickerSessionRequest(): Promise<SessionCreateResponse> {
    const response = await fetch("/api/google-photos/picker/session", {
        method: "POST",
    });
    const payload = (await response.json()) as
        | SessionCreateResponse
        | { error: string };
    if (!response.ok) {
        throw new Error(
            payload.error ??
                "Could not start Google Photos Picker. Please reconnect Google and try again."
        );
    }
    if (!("sessionId" in payload)) {
        throw new Error(
            payload.error ??
                "Could not start Google Photos Picker. Please reconnect Google and try again."
        );
    }
    return payload;
}

async function pollUntilMediaSelected(
    sessionId: string,
    initialPollMs: number,
    timeoutIn: string | null
): Promise<void> {
    const startedAt = Date.now();
    const timeoutMs = parseDurationMs(timeoutIn) ?? 5 * 60_000;
    let pollMs = initialPollMs;

    while (Date.now() - startedAt < timeoutMs) {
        await sleep(Math.max(1000, pollMs));
        const response = await fetch(
            `/api/google-photos/picker/session?id=${encodeURIComponent(sessionId)}`,
            { method: "GET" }
        );
        const payload = (await response.json()) as
            | SessionPollResponse
            | { error: string };
        if (!response.ok) {
            throw new Error(
                payload.error ??
                    "Could not read picker status. Please try again."
            );
        }
        if (!("mediaItemsSet" in payload)) {
            throw new Error(
                payload.error ??
                    "Could not read picker status. Please try again."
            );
        }
        pollMs = payload.pollIntervalMs;
        if (payload.mediaItemsSet) {
            return;
        }
    }

    throw new Error(
        "Selection timed out. Open the picker again and confirm your media."
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
    if (!response.ok) {
        throw new Error(
            payload.error ??
                "Import failed. Ensure Photos permission is granted, then try again."
        );
    }
    if (!("importedCount" in payload)) {
        throw new Error(
            payload.error ??
                "Import failed. Ensure Photos permission is granted, then try again."
        );
    }
    return payload;
}

export function GooglePhotosImportButton({
    size = "icon",
    variant = "ghost",
}: Readonly<{
    buttonLabel?: string;
    size?: React.ComponentProps<typeof Button>["size"];
    variant?: React.ComponentProps<typeof Button>["variant"];
}>) {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const isSignedIn = !!session?.user?.id;

    const handleImport = useCallback(async () => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsImporting(true);
        try {
            const createPayload = await createPickerSessionRequest();

            if (!createPayload.pickerUri) {
                throw new Error("Picker URL is missing. Please try again.");
            }

            window.open(
                createPayload.pickerUri,
                "_blank",
                "noopener,noreferrer"
            );
            await pollUntilMediaSelected(
                createPayload.sessionId,
                createPayload.pollIntervalMs,
                createPayload.timeoutIn
            );
            const importPayload = await importSelectedMedia(
                createPayload.sessionId
            );

            setSuccessMessage(
                `Imported ${importPayload.importedCount} item${importPayload.importedCount === 1 ? "" : "s"}.`
            );
            router.push("/library");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Could not import media.";
            setErrorMessage(message);
        } finally {
            setIsImporting(false);
        }
    }, [router]);

    if (!isSignedIn) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            <Button
                loading={isImporting}
                onClick={handleImport}
                size={size}
                type="button"
                variant={variant}
            >
                <Images className="size-4" />
            </Button>
            {isPending ? (
                <p className="text-muted-foreground text-xs">
                    Loading session…
                </p>
            ) : null}
            {errorMessage ? (
                <p className="text-destructive text-sm" role="alert">
                    {errorMessage}
                </p>
            ) : null}
            {successMessage ? (
                <p className="text-emerald-600 text-sm" role="status">
                    {successMessage}
                </p>
            ) : null}
        </div>
    );
}
