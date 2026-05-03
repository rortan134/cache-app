import { authClient } from "@/lib/auth/client";
import { getErrorMessage } from "@/lib/common/error";
import { asRecord } from "@/lib/common/objects";
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
import { openExternal } from "@/lib/common/url";

const CONNECTION_FLOW_ERROR_MESSAGE = "Could not start the connection flow.";

function navigateTo(url: string) {
    window.location.assign(url);
}

function createConnectionError(args: {
    cause?: unknown;
    message: string;
    operation: string;
}): InstanceType<typeof IntegrationConnectionError> {
    return new IntegrationConnectionError(
        {
            cause: args.cause,
            message: args.message,
            operation: args.operation,
        },
        {
            cause: args.cause,
        }
    );
}

function createApiError(args: {
    cause?: unknown;
    message: string;
    operation: string;
    status: number;
}): InstanceType<typeof IntegrationApiError> {
    return new IntegrationApiError(
        {
            cause: args.cause,
            message: args.message,
            operation: args.operation,
            status: args.status,
        },
        {
            cause: args.cause,
        }
    );
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

/**
 * Executes the behavior for opening an integration (either the app itself or its install page).
 */
export function executeOpenBehavior(
    behavior: ExtensionOpenBehavior,
    extensionInstalled: boolean
) {
    const targetUrl =
        extensionInstalled || !behavior.installUrl
            ? behavior.openUrl
            : behavior.installUrl;

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
            throw createConnectionError({
                cause: result.error,
                message: result.error.message ?? CONNECTION_FLOW_ERROR_MESSAGE,
                operation: "executeConnectBehavior.socialSignIn",
            });
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
        throw createConnectionError({
            cause: response,
            message: CONNECTION_FLOW_ERROR_MESSAGE,
            operation: "executeConnectBehavior.oauthLink",
        });
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
    const payload = (await response.json().catch(() => null)) as unknown;

    const payloadRecord = asRecord(payload);
    if (
        !(
            response.ok &&
            payloadRecord &&
            Object.hasOwn(payloadRecord, behavior.successKey)
        )
    ) {
        throw createApiError({
            cause: payload,
            message: getErrorMessage(payload, behavior.errorMessage),
            operation: "executeRouteSyncBehavior",
            status: response.status,
        });
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
        throw createConnectionError({
            message: "Could not retrieve the setup prompt.",
            operation: "executeCopyPromptBehavior",
        });
    }

    const data = (await response.json().catch(() => null)) as unknown;
    const record = asRecord(data);
    const prompt =
        typeof record?.prompt === "string" ? record.prompt : undefined;

    if (!prompt) {
        throw createConnectionError({
            message: "Setup prompt is unavailable.",
            operation: "executeCopyPromptBehavior",
        });
    }

    await navigator.clipboard.writeText(prompt);
}
