"use client";

import { useIsExtensionInstalled } from "@/hooks/use-extension-installed";
import { getErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import { IntegrationUserError } from "@/lib/integrations/error";
import {
    executeConnectBehavior,
    executeCopyPromptBehavior,
    executeOpenBehavior,
    executeRouteSyncBehavior,
} from "@/lib/integrations/execution";
import { executeGooglePhotosPickerFlow } from "@/lib/integrations/google-photos/client";
import {
    getIntegration,
    listIntegrationActions,
    type ExtensionOpenBehavior,
    type IntegrationActionIcon,
    type IntegrationActionRole,
    type IntegrationActionSize,
    type IntegrationActionVariant,
    type IntegrationDirection,
    type IntegrationId,
    type OAuthLinkConnectBehavior,
    type SocialSignInConnectBehavior,
    type SupportedIntegration,
    type SupportedIntegrationAction,
} from "@/lib/integrations/support";
import { useRouter } from "next/navigation";
import * as React from "react";

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

interface UseIntegrationActionResult {
    actions: IntegrationActionViewModel[];
    errorMessage: string | null;
    successMessage: string | null;
}

function resolveActionLabel(args: {
    connectBehavior?: OAuthLinkConnectBehavior | SocialSignInConnectBehavior;
    explicitLabel?: string;
    extensionInstalled: boolean;
    isConnected: boolean;
    openBehavior?: ExtensionOpenBehavior;
    role: IntegrationActionRole;
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
        return !extensionInstalled && openBehavior.installUrl
            ? "Get Extension"
            : "Open";
    }

    if (role === "connect" && connectBehavior) {
        return isConnected ? "Reconnect" : "Connect";
    }

    if (role === "sync") {
        return "Sync";
    }

    if (role === "copy") {
        return "Copy";
    }

    return "Open";
}

function createCapabilityMissingError(args: {
    capability: "connect" | "copy" | "open" | "sync";
    integrationId: IntegrationId;
    message: string;
}): IntegrationUserError {
    return new IntegrationUserError({
        capability: args.capability,
        integrationId: args.integrationId,
        message: args.message,
        operation: "executeIntegrationAction",
    });
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
            throw createCapabilityMissingError({
                capability: "open",
                integrationId: integration.id,
                message: "This integration cannot be opened yet.",
            });
        }

        executeOpenBehavior(integration.behaviors.open, extensionInstalled);
        return { refresh: false, successMessage: null };
    }

    if (role === "connect") {
        if (!integration.behaviors.connect) {
            throw createCapabilityMissingError({
                capability: "connect",
                integrationId: integration.id,
                message: "This integration cannot be connected yet.",
            });
        }

        await executeConnectBehavior(integration.behaviors.connect);
        return { refresh: false, successMessage: null };
    }

    if (role === "copy") {
        if (!integration.behaviors.copy) {
            throw createCapabilityMissingError({
                capability: "copy",
                integrationId: integration.id,
                message: "This integration does not support copying a prompt.",
            });
        }

        await executeCopyPromptBehavior(integration.behaviors.copy);
        return { refresh: false, successMessage: "Copied to clipboard." };
    }

    // role === "sync"
    if (!integration.behaviors.sync) {
        throw createCapabilityMissingError({
            capability: "sync",
            integrationId: integration.id,
            message: "This integration cannot sync yet.",
        });
    }

    const successMessage =
        integration.behaviors.sync.kind === "route"
            ? await executeRouteSyncBehavior(integration.behaviors.sync)
            : await executeGooglePhotosPickerFlow();

    return { refresh: true, successMessage };
}

function isActionVisible(
    action: SupportedIntegrationAction,
    isConnected: boolean
): boolean {
    if (action.visibleWhen === "connected") {
        return isConnected;
    }

    if (action.visibleWhen === "disconnected") {
        return !isConnected;
    }

    return true;
}

function createActionViewModel(args: {
    action: SupportedIntegrationAction;
    connectBehavior?: OAuthLinkConnectBehavior | SocialSignInConnectBehavior;
    extensionInstalled: boolean;
    isConnected: boolean;
    isLoading: boolean;
    onSelect: (role: IntegrationActionRole) => void | Promise<void>;
    openBehavior?: ExtensionOpenBehavior;
}): IntegrationActionViewModel {
    const {
        action,
        connectBehavior,
        extensionInstalled,
        isConnected,
        isLoading,
        onSelect,
        openBehavior,
    } = args;

    return {
        icon: action.icon,
        isLoading,
        label: resolveActionLabel({
            connectBehavior,
            explicitLabel: action.label,
            extensionInstalled,
            isConnected,
            openBehavior,
            role: action.role,
        }),
        onClick: () => onSelect(action.role),
        role: action.role,
        size: action.size,
        variant: action.variant,
    };
}

/**
 * Builds view models and handlers for integration action buttons (connect,
 * open, sync) based on the integration's capabilities and connection state.
 */
export function useIntegrationAction({
    direction,
    id,
    isConnected,
}: UseIntegrationActionsArgs): UseIntegrationActionResult {
    const router = useRouter();
    const extensionInstalled = useIsExtensionInstalled();
    const integration = getIntegration(id);
    const { behaviors } = integration;
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [pendingRole, setPendingRole] =
        React.useState<IntegrationActionRole | null>(null);
    const [successMessage, setSuccessMessage] = React.useState<string | null>(
        null
    );

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
            const message = getErrorMessage(
                error,
                "Could not complete this integration action."
            );

            log.error("Integration action failed", {
                direction,
                error,
                integrationId: integration.id,
                role,
            });
            setErrorMessage(message);
        } finally {
            setPendingRole(null);
        }
    };

    const actions = listIntegrationActions(id, direction)
        .filter((action) => isActionVisible(action, isConnected))
        .map((action) =>
            createActionViewModel({
                action,
                connectBehavior: behaviors.connect,
                extensionInstalled,
                isConnected,
                isLoading: pendingRole === action.role,
                onSelect: handleAction,
                openBehavior: behaviors.open,
            })
        );

    return {
        actions,
        errorMessage,
        successMessage,
    };
}
