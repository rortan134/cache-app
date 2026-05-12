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
import { useListPanelOpenState } from "@/hooks/use-list-panel-open-state";
import { cn } from "@/lib/common/cn";
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
    INTEGRATIONS,
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
import IntegrationsPreviewImage from "@/public/integrations-preview.webp";
import { T } from "gt-next";
import { ArrowUpRight, Images, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const log = createLogger("integration-actions");

const INTEGRATION_ACTION_ICON_BY_NAME: Record<
    IntegrationActionIcon,
    React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
    images: Images,
    refresh: RefreshCw,
};

type IntegrationActionStatusTone = "error" | "success";

interface IntegrationActionStatus {
    message: string;
    tone: IntegrationActionStatusTone;
}

interface IntegrationActionViewModel {
    icon?: IntegrationActionIcon;
    isLoading: boolean;
    label: string;
    onClick: () => void | Promise<void>;
    role: IntegrationActionRole;
    size: IntegrationActionSize;
    variant: IntegrationActionVariant;
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

export type IntegrationsListItemProps = React.ComponentProps<
    typeof SidebarItem
>;

export type IntegrationsListEmptyProps = React.ComponentProps<"p">;

export interface IntegrationsProps {
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

    if (role === "open" && openBehavior) {
        return !isExtensionInstalled && openBehavior.installUrl
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
    isExtensionInstalled: boolean;
    integration: SupportedIntegration;
    role: IntegrationActionRole;
}): Promise<{
    refresh: boolean;
    successMessage: string | null;
}> {
    const { isExtensionInstalled, integration, role } = args;

    if (role === "open") {
        if (!integration.behaviors.open) {
            throw createCapabilityMissingError({
                capability: "open",
                integrationId: integration.id,
                message: "This integration cannot be opened yet.",
            });
        }

        executeOpenBehavior(integration.behaviors.open, isExtensionInstalled);
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
    isExtensionInstalled: boolean;
    isConnected: boolean;
    isLoading: boolean;
    onSelect: (role: IntegrationActionRole) => void | Promise<void>;
    openBehavior?: ExtensionOpenBehavior;
}): IntegrationActionViewModel {
    const {
        action,
        connectBehavior,
        isExtensionInstalled,
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
            isConnected,
            isExtensionInstalled,
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
 * Persist the integrations panel open state across page reloads.
 */
const { useStore: useIntegrationsListStore } = createStore({
    isIntegrationsListPanelOpen: storage(false),
});

export function useIntegrationsListOpenState() {
    const { isIntegrationsListPanelOpen, setIsIntegrationsListPanelOpen } =
        useIntegrationsListStore();

    return [
        isIntegrationsListPanelOpen,
        setIsIntegrationsListPanelOpen,
    ] as const;
}

/**
 * Decouple the expand action from the sidebar tree so any caller can open the
 * panel without access to the collapsible state.
 */
export function useIntegrationsListControls() {
    const { setIsIntegrationsListPanelOpen } = useIntegrationsListStore();

    return {
        openIntegrationsList: () => setIsIntegrationsListPanelOpen(true),
    };
}

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

    const handleAction = async (role: IntegrationActionRole) => {
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
                setStatus({ message: result.successMessage, tone: "success" });
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
    };

    const actions = listIntegrationActions(id, direction)
        .filter((action) => isActionVisible(action, isConnected))
        .map((action) =>
            createActionViewModel({
                action,
                connectBehavior: behaviors.connect,
                isConnected,
                isExtensionInstalled,
                isLoading: pendingRole === action.role,
                onSelect: handleAction,
                openBehavior: behaviors.open,
            })
        );

    return {
        actions,
        status,
    };
}

export function Integrations({ connectedIntegrations }: IntegrationsProps) {
    return (
        <IntegrationsList data-sidebar-collapsible="">
            <IntegrationsListTrigger>
                <span className="min-w-0 text-xs">
                    <T>Integrations</T>
                </span>
                <ChevronDownFilledIcon className="-ml-0.5" />
                <Kbd className="ml-auto bg-transparent opacity-0 group-hover:opacity-50">
                    <CmdKbd />I
                </Kbd>
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
                            <span className="grid text-muted-foreground leading-snug">
                                <span className="text-[11px] [grid-area:1/1] group-hover:opacity-0">
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

export function IntegrationsList(
    props: Omit<
        React.ComponentProps<typeof Collapsible>,
        "open" | "onOpenChange"
    >
) {
    const state = useIntegrationsListOpenState();
    const [isOpen, handleOpenChange] = useListPanelOpenState({
        hotkey: "mod+i",
        state,
    });

    return (
        <Collapsible onOpenChange={handleOpenChange} open={isOpen} {...props} />
    );
}

export function IntegrationsListTrigger({
    render,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    const [isOpen] = useIntegrationsListOpenState();

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    render ?? (
                        <CollapsibleTrigger
                            render={
                                <SidebarItem
                                    render={<button type="button" />}
                                />
                            }
                            title={isOpen ? "Collapse panel" : "Expand panel"}
                            {...props}
                        />
                    )
                }
            />
            <PopoverPopup
                align="start"
                positionerClassname={cn(
                    isOpen && "pointer-events-none! hidden!"
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

export function IntegrationsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

export function IntegrationsListFeedback() {
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

export function IntegrationsListPrivacyNotice() {
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

export function IntegrationsListItem({
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

export function IntegrationsListEmpty({
    className,
    ...props
}: IntegrationsListEmptyProps) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            className={cn(
                "rounded-lg border border-border/30 border-dashed px-4 py-6 text-center text-muted-foreground text-xs",
                className
            )}
            {...props}
        />
    );
}

export function IntegrationsListItemAction({
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

    if (!(hasActions || status)) {
        return null;
    }

    return (
        <div
            className={cn(
                "ml-auto flex min-w-0 flex-1 flex-row-reverse items-center justify-end gap-1",
                className
            )}
        >
            {hasActions && (
                <div className="flex shrink-0 items-center gap-1">
                    {actions.map((action) => {
                        const ActionIcon = action.icon
                            ? INTEGRATION_ACTION_ICON_BY_NAME[action.icon]
                            : null;
                        const isIconOnly = action.size === "icon";

                        return (
                            <Button
                                aria-label={
                                    isIconOnly ? action.label : undefined
                                }
                                className="rounded-full text-xs!"
                                key={`${id}-${direction}-${action.role}`}
                                loading={action.isLoading}
                                onClick={action.onClick}
                                size={action.size}
                                variant={action.variant ?? "ghost"}
                            >
                                {ActionIcon && (
                                    <ActionIcon
                                        aria-hidden
                                        className="size-4"
                                        focusable="false"
                                    />
                                )}
                                {!isIconOnly && action.label}
                            </Button>
                        );
                    })}
                </div>
            )}
            {status && (
                <IntegrationsListStatus tone={status.tone}>
                    {status.message}
                </IntegrationsListStatus>
            )}
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
