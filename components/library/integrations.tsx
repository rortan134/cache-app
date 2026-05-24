"use client";

import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DisclosureList } from "@/components/ui/disclosure-list";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import {
    Popover,
    PopoverDescription,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarItem } from "@/components/ui/sidebar";
import { useIsExtensionInstalled } from "@/hooks/use-extension-installed";
import { cn } from "@/lib/common/cn";
import { getErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    executeConnectBehavior,
    executeCopyPromptBehavior,
    executeOpenBehavior,
    executeRouteSyncBehavior,
} from "@/lib/integrations/client";
import { IntegrationUserError } from "@/lib/integrations/error";
import { executeGooglePhotosPickerFlow } from "@/lib/integrations/google-photos/client";
import {
    INTEGRATIONS,
    getIntegration,
    listIntegrationActions,
    type ExtensionOpenBehavior,
    type IntegrationActionRole,
    type IntegrationDirection,
    type IntegrationId,
    type OAuthLinkConnectBehavior,
    type SocialSignInConnectBehavior,
    type SupportedIntegration,
    type SupportedIntegrationAction,
} from "@/lib/integrations/support";
import IntegrationsPreviewImage from "@/public/integrations-preview.webp";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T } from "gt-next";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const log = createLogger("library:integrations");

type IntegrationActionStatusTone = "error" | "success";

interface IntegrationActionStatus {
    message: string;
    tone: IntegrationActionStatusTone;
}

interface IntegrationActionViewModel {
    isLoading: boolean;
    label: string;
    onClick: () => void | Promise<void>;
    role: IntegrationActionRole;
}

interface UseIntegrationActionArgs {
    direction: IntegrationDirection;
    id: IntegrationId;
    isConnected: boolean;
}

interface UseIntegrationActionResult {
    actions: IntegrationActionViewModel[];
    status: IntegrationActionStatus | null;
}

type IntegrationsListItemProps = React.ComponentProps<typeof SidebarItem>;

interface IntegrationsProps {
    connectedIntegrations: Set<IntegrationId>;
}

interface IntegrationsListStatusProps extends React.ComponentProps<"p"> {
    tone?: IntegrationActionStatusTone;
}

interface IntegrationsListItemActionProps {
    className?: string;
    direction?: IntegrationDirection;
    id: IntegrationId;
    isConnected: boolean;
}

function resolveActionLabel(args: {
    connectBehavior?: OAuthLinkConnectBehavior | SocialSignInConnectBehavior;
    explicitLabel?: string;
    isExtensionInstalled: boolean;
    isConnected: boolean;
    openBehavior?: ExtensionOpenBehavior;
    role: IntegrationActionRole;
}): string {
    const {
        connectBehavior,
        explicitLabel,
        isExtensionInstalled,
        isConnected,
        openBehavior,
        role,
    } = args;

    if (explicitLabel) {
        return explicitLabel;
    }

    switch (role) {
        case "open":
            return !isExtensionInstalled && openBehavior?.installUrl
                ? "Get Extension"
                : "Open";
        case "connect":
            if (!connectBehavior) {
                return "Open";
            }
            return isConnected ? "Reconnect" : "Connect";
        case "sync":
            return "Sync";
        case "copy":
            return "Copy";
        default:
            return "Open";
    }
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
    isExtensionInstalled: boolean;
    integration: SupportedIntegration;
    role: IntegrationActionRole;
}): Promise<{
    refresh: boolean;
    successMessage: string | null;
}> {
    const { isExtensionInstalled, integration, role } = args;

    switch (role) {
        case "open": {
            if (!integration.behaviors.open) {
                throw createCapabilityMissingError({
                    capability: "open",
                    integrationId: integration.id,
                    message: "This integration cannot be opened yet.",
                });
            }

            executeOpenBehavior(
                integration.behaviors.open,
                isExtensionInstalled
            );
            return { refresh: false, successMessage: null };
        }

        case "connect": {
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

        case "copy": {
            if (!integration.behaviors.copy) {
                throw createCapabilityMissingError({
                    capability: "copy",
                    integrationId: integration.id,
                    message:
                        "This integration does not support copying a prompt.",
                });
            }

            await executeCopyPromptBehavior(integration.behaviors.copy);
            return { refresh: false, successMessage: "Copied to clipboard." };
        }

        case "sync": {
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
        default:
            return { refresh: false, successMessage: null };
    }
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

/**
 * Persist the integrations panel open state across page reloads.
 */
export const { useStore: useIntegrationsListStore } = createStore({
    isIntegrationsListOpen: storage(false),
});

/**
 * Builds view models and handlers for integration action buttons (connect,
 * open, sync) based on the integration's capabilities and connection state.
 */
function useIntegrationAction({
    direction,
    id,
    isConnected,
}: UseIntegrationActionArgs): UseIntegrationActionResult {
    const router = useRouter();
    const isExtensionInstalled = useIsExtensionInstalled();

    const integration = getIntegration(id);
    const { behaviors } = integration;

    const [status, setStatus] = React.useState<IntegrationActionStatus | null>(
        null
    );
    const [pendingRole, setPendingRole] =
        React.useState<IntegrationActionRole | null>(null);

    const handleAction = useStableCallback(
        async (role: IntegrationActionRole) => {
            setStatus(null);
            setPendingRole(role);

            try {
                const result = await executeIntegrationAction({
                    integration,
                    isExtensionInstalled,
                    role,
                });

                if (result.refresh) {
                    router.refresh();
                }
                if (result.successMessage) {
                    setStatus({
                        message: result.successMessage,
                        tone: "success",
                    });
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
                setStatus({ message, tone: "error" });
            } finally {
                setPendingRole(null);
            }
        }
    );

    const actions = listIntegrationActions(id, direction)
        .filter((action) => isActionVisible(action, isConnected))
        .map(
            (action) =>
                ({
                    isLoading: pendingRole === action.role,
                    label: resolveActionLabel({
                        connectBehavior: behaviors.connect,
                        explicitLabel: action.label,
                        isConnected,
                        isExtensionInstalled,
                        openBehavior: behaviors.open,
                        role: action.role,
                    }),
                    onClick: () => handleAction(action.role),
                    role: action.role,
                }) satisfies IntegrationActionViewModel
        );

    return { actions, status };
}

export function Integrations({ connectedIntegrations }: IntegrationsProps) {
    return (
        <IntegrationsList
            className="group/collapsible"
            data-sidebar-collapsible=""
        >
            <IntegrationsListTrigger>
                <T>Integrations</T>
            </IntegrationsListTrigger>
            <IntegrationsListPanel>
                <DisclosureList maxVisible={6}>
                    {INTEGRATIONS.map(({ id, label, description, Icon }) => (
                        <IntegrationsListItem className="group" key={id}>
                            <Avatar
                                aria-label={label}
                                className="size-6 rounded-md"
                            >
                                <AvatarFallback className="rounded-md">
                                    <Icon
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0"
                                        focusable="false"
                                    />
                                </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 font-medium text-sm leading-snug">
                                {label}
                            </span>
                            <span className="grid items-center text-muted-foreground leading-snug">
                                <span className="text-right text-[11px] [grid-area:1/1] group-hover:opacity-0">
                                    {description}
                                </span>
                                <IntegrationsListItemAction
                                    className="opacity-0 [grid-area:1/1] group-hover:opacity-100"
                                    id={id}
                                    isConnected={connectedIntegrations.has(id)}
                                />
                            </span>
                        </IntegrationsListItem>
                    ))}
                </DisclosureList>
                <IntegrationsListFeedback />
                <IntegrationsListPrivacyNotice />
            </IntegrationsListPanel>
        </IntegrationsList>
    );
}

function IntegrationsList({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const { isIntegrationsListOpen, setIsIntegrationsListOpen } =
        useIntegrationsListStore();

    const handleKeyShortcutPress = useStableCallback(() => {
        setIsIntegrationsListOpen((prev) => !prev);
    });

    useHotkeys("mod+i", handleKeyShortcutPress, {
        description: "Toggle integrations panel",
        preventDefault: true,
    });

    return (
        <Collapsible
            {...props}
            className={cn("relative", className)}
            onOpenChange={setIsIntegrationsListOpen}
            open={isIntegrationsListOpen}
        />
    );
}

function IntegrationsListTrigger({
    children,
    render,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    const { isIntegrationsListOpen } = useIntegrationsListStore();

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        {...props}
                        render={
                            render ?? (
                                <SidebarItem
                                    render={<button type="button" />}
                                />
                            )
                        }
                        title={
                            isIntegrationsListOpen
                                ? "Collapse group"
                                : "Expand group"
                        }
                    />
                }
            >
                <span className="min-w-0 text-xs">
                    {children}&nbsp;({INTEGRATIONS.length})
                </span>
                <ChevronDownFilledIcon className="-ml-0.5" />
                <Kbd className="ml-auto bg-transparent opacity-0 group-hover:opacity-50 group-has-data-open/collapsible:hidden">
                    <CmdKbd />I
                </Kbd>
            </PopoverTrigger>
            <PopoverPopup
                align="start"
                positionerClassname={cn(
                    isIntegrationsListOpen && "pointer-events-none! hidden!"
                )}
                positionMethod="fixed"
                side="right"
            >
                <Image
                    alt=""
                    aria-hidden
                    className="-mx-(--viewport-inline-padding) -mt-4 h-auto w-(--positioner-width) min-w-0 max-w-(--positioner-width) rounded-t-lg border-b"
                    priority
                    sizes="auto,400px"
                    src={IntegrationsPreviewImage}
                />
                <div className="mt-4 flex max-w-64 flex-col gap-2">
                    <PopoverTitle>Places to return to</PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs">
                        Give every bookmark more meaning.
                    </PopoverDescription>
                </div>
            </PopoverPopup>
        </Popover>
    );
}

function IntegrationsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

function IntegrationsListFeedback() {
    return (
        <FeedbackWidget
            className="mx-2.5 mt-1.5 mb-0.5"
            context="integrations-list"
        >
            <p className="text-left text-[11px] text-muted-foreground leading-tight">
                Can't find the integration you need most?{" "}
                <Button
                    className="h-fit! px-0 leading-tight sm:text-[11px]"
                    render={<span />}
                    size="xs"
                    variant="link"
                >
                    Request it
                </Button>
            </p>
        </FeedbackWidget>
    );
}

function IntegrationsListPrivacyNotice() {
    const [isOpen, setIsOpen] = React.useState(true);

    return (
        <Collapsible
            className="mx-2.5 pb-1"
            onOpenChange={setIsOpen}
            open={isOpen}
        >
            <CollapsiblePanel>
                <p className="text-[11px] text-muted-foreground leading-tight">
                    Please only connect accounts you trust. Cache can access
                    what you choose to save with connected apps. You can always
                    change your mind.{" "}
                    <Button
                        className="h-fit! px-0 leading-tight sm:text-[11px]"
                        onClick={() => setIsOpen(false)}
                        size="xs"
                        variant="link"
                    >
                        Dismiss
                    </Button>{" "}
                    or{" "}
                    <Button
                        className="h-fit! px-0 leading-tight sm:text-[11px]"
                        render={
                            <Link
                                href="/legal/privacy-policy"
                                target="_blank"
                            />
                        }
                        size="xs"
                        variant="link"
                    >
                        Cache Privacy
                        <ArrowUpRight className="inline-block size-3 shrink-0 text-muted-foreground" />
                    </Button>
                </p>
            </CollapsiblePanel>
        </Collapsible>
    );
}

function IntegrationsListItem({
    className,
    ...props
}: IntegrationsListItemProps) {
    return (
        <SidebarItem
            className={cn("gap-2.5 py-0.5 opacity-100", className)}
            {...props}
        />
    );
}

function IntegrationsListItemAction({
    direction = "source",
    id,
    isConnected,
    className,
}: IntegrationsListItemActionProps) {
    const { actions, status } = useIntegrationAction({
        direction,
        id,
        isConnected,
    });

    const hasActions = actions.length > 0;
    if (!hasActions) {
        return null;
    }

    return (
        <div
            className={cn(
                "-mr-2.5 flex min-w-0 shrink-0 items-center justify-end gap-1",
                className
            )}
        >
            <IntegrationsListStatus tone={status?.tone}>
                {status?.message}
            </IntegrationsListStatus>
            {actions.map((action) => (
                <Button
                    className="rounded-full text-xs!"
                    key={`${id}-${direction}-${action.role}`}
                    loading={action.isLoading}
                    onClick={action.onClick}
                    size="sm"
                    variant="ghost"
                >
                    {action.label}
                </Button>
            ))}
        </div>
    );
}

function IntegrationsListStatus({
    tone = "success",
    className,
    ...props
}: IntegrationsListStatusProps) {
    if (!props.children) {
        return null;
    }

    const isError = tone === "error";

    return (
        <p
            aria-atomic="true"
            aria-live={isError ? "assertive" : "polite"}
            className={cn(
                "max-w-full text-right text-xs leading-tight",
                isError ? "text-destructive" : "text-muted-foreground",
                className
            )}
            role={isError ? "alert" : "status"}
            {...props}
        />
    );
}
