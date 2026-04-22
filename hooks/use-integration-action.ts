"use client";

import { useIsExtensionInstalled } from "@/hooks/use-extension-installed";
import { getErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import { IntegrationCapabilityMissingError } from "@/lib/integrations/error";
import { executeGooglePhotosPickerFlow } from "@/lib/integrations/google-photos/client";
import {
    executeConnectBehavior,
    executeOpenBehavior,
    executeRouteSyncBehavior,
} from "@/lib/integrations/shared/execution";
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
} from "@/lib/integrations/support";
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

    return "Open";
}

function createCapabilityMissingError(args: {
    capability: "connect" | "open" | "sync";
    integrationId: IntegrationId;
    message: string;
}): InstanceType<typeof IntegrationCapabilityMissingError> {
    return new IntegrationCapabilityMissingError({
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
            const message = getErrorMessage(
                error,
                "Could not complete this integration action."
            );

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
