import { authClient } from "@/lib/auth/client";
import { getErrorMessage } from "@/lib/common/error";
import { asRecord } from "@/lib/common/objects";
import type {
    ExtensionOpenBehavior,
    OAuthLinkConnectBehavior,
    RouteSyncBehavior,
    SocialSignInConnectBehavior,
} from "@/lib/integrations/support";

/**
 * Opens a URL in the browser, attempting to use the desktop bridge if available.
 */
export function openExternal(url: string) {
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

    const root = asRecord(response);
    const payload = asRecord(root?.data) ?? root;
    const redirectUrl = payload?.url;

    if (typeof redirectUrl !== "string" || redirectUrl.length === 0) {
        throw new Error("Could not start the connection flow.");
    }

    window.location.assign(redirectUrl);
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
    const payload = (await response.json()) as unknown;

    const payloadRecord = asRecord(payload);
    if (
        !(
            response.ok &&
            payloadRecord &&
            Object.hasOwn(payloadRecord, behavior.successKey)
        )
    ) {
        throw new Error(getErrorMessage(payload, behavior.errorMessage));
    }

    return behavior.successMessage?.(payloadRecord) ?? null;
}
