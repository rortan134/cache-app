import { authClient } from "@/lib/auth/client";
import { CACHE_SITE_OPEN_AND_SYNC_EVENT } from "@/lib/common/constants";
import { getErrorMessage } from "@/lib/common/error";
import { asRecord } from "@/lib/common/objects";
import { openExternal } from "@/lib/common/url";
import {
    IntegrationApiError,
    IntegrationConnectionError,
} from "@/lib/integrations/error";
import type {
    CopyPromptBehavior,
    ExtensionOpenBehavior,
    OAuthLinkConnectBehavior,
    RouteSyncBehavior,
    SocialSignInConnectBehavior,
} from "@/lib/integrations/support";

const CONNECTION_FLOW_ERROR_MESSAGE = "Failed to start the connection";

function navigateTo(url: string) {
    window.location.assign(url);
}

function extractRedirectUrl(payload: unknown): string | null {
    const root = asRecord(payload);
    const data = asRecord(root?.data) ?? root;
    const redirectUrl = data?.url;

    if (typeof redirectUrl !== "string" || redirectUrl.length === 0) {
        return null;
    }

    return redirectUrl;
}

async function readJsonOrNull(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Executes the behavior for opening an integration (either the app itself or its install page).
 *
 * When `behavior.autoSync` is set and the extension is installed, a `postMessage`
 * is sent so the extension can start syncing that source. The URL is always opened
 * via `openExternal` so the user gets immediate visible feedback.
 */
export function executeOpenBehavior(
    behavior: ExtensionOpenBehavior,
    extensionInstalled: boolean
) {
    if (
        extensionInstalled &&
        behavior.autoSync &&
        typeof window !== "undefined"
    ) {
        window.postMessage(
            {
                openURL: behavior.openURL,
                type: CACHE_SITE_OPEN_AND_SYNC_EVENT,
            },
            window.location.origin
        );
    }

    const targetUrl =
        extensionInstalled || !behavior.installURL
            ? behavior.openURL
            : behavior.installURL;

    openExternal(targetUrl);
}

/**
 * Executes the behavior for connecting an integration via OAuth or Social Sign-in.
 */
export async function executeConnectBehavior(
    behavior: OAuthLinkConnectBehavior | SocialSignInConnectBehavior
) {
    if (behavior.kind === "social-sign-in") {
        const result = await authClient.signIn.social({
            callbackURL: behavior.callbackURL,
            errorCallbackURL: behavior.errorCallbackURL,
            provider: behavior.provider,
        });

        if (result.error) {
            throw new IntegrationConnectionError(
                {
                    cause: result.error,
                    message:
                        result.error.message ?? CONNECTION_FLOW_ERROR_MESSAGE,
                    operation: "executeConnectBehavior.socialSignIn",
                },
                { cause: result.error }
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

    const url = extractRedirectUrl(response);
    if (!url) {
        throw new IntegrationConnectionError(
            {
                cause: response,
                message: CONNECTION_FLOW_ERROR_MESSAGE,
                operation: "executeConnectBehavior.oauthLink",
            },
            { cause: response }
        );
    }

    navigateTo(url);
}

/**
 * Executes a sync behavior that triggers a specific API route.
 */
export async function executeRouteSyncBehavior(
    behavior: RouteSyncBehavior
): Promise<string | null> {
    const response = await fetch(behavior.path, {
        method: behavior.method,
    });
    const payload = await readJsonOrNull(response);

    const payloadRecord = asRecord(payload);
    if (
        !(
            response.ok &&
            payloadRecord &&
            Object.hasOwn(payloadRecord, behavior.successKey)
        )
    ) {
        throw new IntegrationApiError(
            {
                cause: payload,
                message: getErrorMessage(payload, behavior.errorMessage),
                operation: "executeRouteSyncBehavior",
                status: response.status,
            },
            { cause: payload }
        );
    }

    return behavior.successMessage?.(payloadRecord) ?? null;
}

/**
 * Fetches a setup prompt from an API route and copies it to the clipboard.
 */
export async function executeCopyPromptBehavior(
    behavior: CopyPromptBehavior
): Promise<void> {
    const response = await fetch(behavior.path, { method: "POST" });
    if (!response.ok) {
        throw new IntegrationConnectionError({
            message: "Could not retrieve the setup prompt.",
            operation: "executeCopyPromptBehavior",
        });
    }

    const data = await readJsonOrNull(response);
    const record = asRecord(data);
    const prompt =
        typeof record?.prompt === "string" ? record.prompt : undefined;

    if (!prompt) {
        throw new IntegrationConnectionError({
            message: "Setup prompt is unavailable.",
            operation: "executeCopyPromptBehavior",
        });
    }

    await navigator.clipboard.writeText(prompt);
}
