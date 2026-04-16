"use client";

import { useIsExtensionInstalled } from "@/hooks/use-extension-installed";
import { authClient } from "@/lib/auth/client";
import {
    getIntegration,
    listIntegrationActions,
    type ExtensionOpenBehavior,
    type GooglePhotosPickerSyncBehavior,
    type IntegrationActionIcon,
    type IntegrationActionRole,
    type IntegrationActionSize,
    type IntegrationActionVariant,
    type IntegrationDirection,
    type IntegrationId,
    type OAuthLinkConnectBehavior,
    type RouteSyncBehavior,
    type SocialSignInConnectBehavior,
    type SupportedIntegration,
} from "@/lib/integrations/support";
import { createLogger } from "@/lib/logs/console/logger";
import { useRouter } from "next/navigation";
import { useState } from "react";

const log = createLogger("integration-actions");

interface IntegrationActionViewModel {
    icon?: IntegrationActionIcon;
    isLoading: boolean;
    label: string;
    onClick: () => void | Promise<void>;
    role: IntegrationActionRole;
    size: IntegrationActionSize;
    variant: IntegrationActionVariant;
}

interface UseIntegrationActionsArgs {
    direction: IntegrationDirection;
    id: IntegrationId;
    isConnected: boolean;
}

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

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : null;
}

function extractErrorMessage(
    payload: unknown,
    fallbackMessage: string
): string {
    const error = asRecord(payload)?.error;
    return typeof error === "string" && error.length > 0
        ? error
        : fallbackMessage;
}

function hasRequiredKey(payload: unknown, key: string): boolean {
    return Object.hasOwn(asRecord(payload) ?? {}, key);
}

function readRedirectUrl(response: unknown): string | null {
    const root = asRecord(response);
    const payload = asRecord(root?.data) ?? root;
    const url = payload?.url;

    return typeof url === "string" && url.length > 0 ? url : null;
}

function openExternal(url: string) {
    try {
        if (typeof window.openai !== "undefined") {
            window.openai.openExternal({ href: url });
            return;
        }
    } catch {
        // Fall back to a normal browser navigation when the desktop bridge is unavailable.
    }

    window.location.assign(url);
}

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

    if (!(response.ok && "sessionId" in payload)) {
        throw new Error(
            extractErrorMessage(
                payload,
                "Could not start Google Photos Picker. Please reconnect Google and try again."
            )
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

        if (!(response.ok && "mediaItemsSet" in payload)) {
            throw new Error(
                extractErrorMessage(
                    payload,
                    "Could not read picker status. Please try again."
                )
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

    if (!(response.ok && "importedCount" in payload)) {
        throw new Error(
            extractErrorMessage(
                payload,
                "Import failed. Ensure Photos permission is granted, then try again."
            )
        );
    }

    return payload;
}

function resolveOpenActionLabel(
    behavior: ExtensionOpenBehavior,
    extensionInstalled: boolean
): string {
    if (!extensionInstalled && behavior.installUrl) {
        return "Get Extension";
    }

    return "Open";
}

function resolveActionLabel(args: {
    connectBehavior?: OAuthLinkConnectBehavior | SocialSignInConnectBehavior;
    extensionInstalled: boolean;
    isConnected: boolean;
    role: IntegrationActionRole;
    openBehavior?: ExtensionOpenBehavior;
    explicitLabel?: string;
}): string {
    const {
        connectBehavior,
        explicitLabel,
        extensionInstalled,
        isConnected,
        openBehavior,
        role,
    } = args;

    if (explicitLabel) {
        return explicitLabel;
    }

    if (role === "open" && openBehavior) {
        return resolveOpenActionLabel(openBehavior, extensionInstalled);
    }

    if (role === "connect" && connectBehavior) {
        return isConnected ? "Reconnect" : "Connect";
    }

    if (role === "sync") {
        return "Sync";
    }

    return "Open";
}

function executeOpenBehavior(
    behavior: ExtensionOpenBehavior,
    extensionInstalled: boolean
) {
    const targetUrl =
        extensionInstalled || !behavior.installUrl
            ? behavior.openUrl
            : behavior.installUrl;

    openExternal(targetUrl);
}

async function executeConnectBehavior(
    behavior: OAuthLinkConnectBehavior | SocialSignInConnectBehavior
) {
    if (behavior.kind === "social-sign-in") {
        const result = await authClient.signIn.social({
            callbackURL: behavior.callbackURL,
            errorCallbackURL: behavior.errorCallbackURL,
            provider: behavior.provider,
        });

        if (result.error) {
            throw new Error(
                result.error.message ?? "Could not start the connection flow."
            );
        }

        return;
    }

    const response = await authClient.$fetch("/oauth2/link", {
        body: {
            callbackURL: behavior.callbackURL,
            disableRedirect: true,
            errorCallbackURL: behavior.errorCallbackURL,
            providerId: behavior.providerId,
        },
        method: "POST",
    });

    const redirectUrl = readRedirectUrl(response);
    if (!redirectUrl) {
        throw new Error("Could not start the connection flow.");
    }

    window.location.assign(redirectUrl);
}

async function executeRouteSyncBehavior(
    behavior: RouteSyncBehavior
): Promise<string | null> {
    const response = await fetch(behavior.path, {
        method: behavior.method,
    });
    const payload = (await response.json()) as unknown;

    if (!(response.ok && hasRequiredKey(payload, behavior.successKey))) {
        throw new Error(extractErrorMessage(payload, behavior.errorMessage));
    }

    const payloadRecord = asRecord(payload);
    if (!payloadRecord) {
        throw new Error(behavior.errorMessage);
    }

    return behavior.successMessage?.(payloadRecord) ?? null;
}

async function executeGooglePhotosPickerBehavior(
    _behavior: GooglePhotosPickerSyncBehavior
): Promise<string | null> {
    const createPayload = await createPickerSessionRequest();

    if (!createPayload.pickerUri) {
        throw new Error("Picker URL is missing. Please try again.");
    }

    window.open(createPayload.pickerUri, "_blank", "noopener,noreferrer");
    await pollUntilMediaSelected(
        createPayload.sessionId,
        createPayload.pollIntervalMs,
        createPayload.timeoutIn
    );
    const importPayload = await importSelectedMedia(createPayload.sessionId);

    return `Imported ${importPayload.importedCount} item${importPayload.importedCount === 1 ? "" : "s"}.`;
}

async function executeIntegrationAction(args: {
    extensionInstalled: boolean;
    integration: SupportedIntegration;
    role: IntegrationActionRole;
}): Promise<{
    refresh: boolean;
    successMessage: string | null;
}> {
    const { extensionInstalled, integration, role } = args;

    if (role === "open") {
        if (!integration.behaviors.open) {
            throw new Error("This integration cannot be opened yet.");
        }

        executeOpenBehavior(integration.behaviors.open, extensionInstalled);
        return { refresh: false, successMessage: null };
    }

    if (role === "connect") {
        if (!integration.behaviors.connect) {
            throw new Error("This integration cannot be connected yet.");
        }

        await executeConnectBehavior(integration.behaviors.connect);
        return { refresh: false, successMessage: null };
    }

    if (!integration.behaviors.sync) {
        throw new Error("This integration cannot sync yet.");
    }

    const successMessage =
        integration.behaviors.sync.kind === "route"
            ? await executeRouteSyncBehavior(integration.behaviors.sync)
            : await executeGooglePhotosPickerBehavior(
                  integration.behaviors.sync
              );

    return { refresh: true, successMessage };
}

export function useIntegrationAction({
    direction,
    id,
    isConnected,
}: UseIntegrationActionsArgs): {
    actions: IntegrationActionViewModel[];
    errorMessage: string | null;
    successMessage: string | null;
} {
    const router = useRouter();
    const extensionInstalled = useIsExtensionInstalled();
    const integration = getIntegration(id);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [pendingRole, setPendingRole] =
        useState<IntegrationActionRole | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleAction = async (role: IntegrationActionRole) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setPendingRole(role);

        try {
            const result = await executeIntegrationAction({
                extensionInstalled,
                integration,
                role,
            });

            if (result.refresh) {
                router.refresh();
            }
            if (result.successMessage) {
                setSuccessMessage(result.successMessage);
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Could not complete this integration action.";

            log.error("Integration action failed", {
                direction,
                error,
                integrationId: id,
                role,
            });
            setErrorMessage(message);
        } finally {
            setPendingRole(null);
        }
    };

    const actions = listIntegrationActions(id, direction)
        .filter(
            (action) =>
                action.visibleWhen !== "connected" || Boolean(isConnected)
        )
        .map((action) => ({
            icon: action.icon,
            isLoading: pendingRole === action.role,
            label: resolveActionLabel({
                connectBehavior: integration.behaviors.connect,
                explicitLabel: action.label,
                extensionInstalled,
                isConnected,
                openBehavior: integration.behaviors.open,
                role: action.role,
            }),
            onClick: () => handleAction(action.role),
            role: action.role,
            size: action.size,
            variant: action.variant,
        }));

    return {
        actions,
        errorMessage,
        successMessage,
    };
}
