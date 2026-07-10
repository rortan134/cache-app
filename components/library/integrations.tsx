"use client";

import { RssManageDialog, openRssManageDialog } from "@/components/library/rss";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DisclosureListVertical } from "@/components/ui/disclosure-list";
import { HighlightIn } from "@/components/ui/highlight-in";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { CmdKbd, Kbd } from "@/components/ui/kbd";
import {
    PreviewCard,
    PreviewCardPopup,
    PreviewCardTrigger,
} from "@/components/ui/preview-card";
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
    type ExtensionOpenBehavior,
    type IntegrationActionRole,
    type IntegrationDirection,
    type IntegrationIcon,
    type IntegrationId,
    type OAuthLinkConnectBehavior,
    type RssManageConnectBehavior,
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

interface IntegrationsProps {
    connectedIntegrations: Set<IntegrationId>;
}

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

interface IntegrationsListStatusProps extends React.ComponentProps<"p"> {
    tone?: IntegrationActionStatusTone;
}

interface IntegrationsListItemProps
    extends React.ComponentProps<typeof SidebarItem> {
    description: string;
    direction?: IntegrationDirection;
    Icon: IntegrationIcon;
    integrationId: IntegrationId;
    isConnected: boolean;
    label: string;
}

interface IntegrationsListItemPreviewTriggerProps {
    integrationId: IntegrationId;
    onClick?: () => void;
    render: React.ReactElement;
}

interface IntegrationsListItemActionsProps extends React.ComponentProps<"div"> {
    actions: IntegrationActionViewModel[];
    integrationId: IntegrationId;
    status: IntegrationActionStatus | null;
}

interface IntegrationsListItemActionButtonProps {
    action: IntegrationActionViewModel;
}

export const { useStore: useIntegrationsListStore } = createStore({
    isIntegrationsListOpen: storage(true),
});

export function Integrations({ connectedIntegrations }: IntegrationsProps) {
    return (
        <IntegrationsList
            className="group/collapsible"
            data-sidebar-collapsible=""
        >
            <IntegrationsListTrigger
                connectedCount={connectedIntegrations.size}
            >
                <T>Integrations</T>
            </IntegrationsListTrigger>
            <IntegrationsListPanel>
                <DisclosureListVertical maxVisible={6}>
                    {INTEGRATIONS.map(({ description, Icon, id, label }) => (
                        <IntegrationsListItem
                            className="group"
                            description={description}
                            direction={
                                getIntegration(id).source
                                    ? "source"
                                    : "destination"
                            }
                            Icon={Icon}
                            integrationId={id}
                            isConnected={connectedIntegrations.has(id)}
                            key={id}
                            label={label}
                        />
                    ))}
                </DisclosureListVertical>
                <IntegrationsListPrivacyDisclaimer />
                <RssManageDialog />
            </IntegrationsListPanel>
        </IntegrationsList>
    );
}

function resolveActionLabel(args: {
    connectBehavior?:
        | OAuthLinkConnectBehavior
        | RssManageConnectBehavior
        | SocialSignInConnectBehavior;
    label?: string;
    isExtensionInstalled: boolean;
    isConnected: boolean;
    openBehavior?: ExtensionOpenBehavior;
    role: IntegrationActionRole;
}): string {
    const {
        connectBehavior,
        label,
        isExtensionInstalled,
        isConnected,
        openBehavior,
        role,
    } = args;

    if (label) {
        return label;
    }

    switch (role) {
        case "open":
            if (!isExtensionInstalled && openBehavior?.installURL) {
                return "Get Extension";
            }
            return "Open";
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
            ((_: never) => _)(role);
            return "Open";
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

function buildCapabilityMissingError({
    capability,
    integrationId,
    message,
}: {
    capability: "connect" | "copy" | "open" | "sync";
    integrationId: IntegrationId;
    message: string;
}): IntegrationUserError {
    return new IntegrationUserError({
        capability,
        integrationId,
        message,
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
                throw buildCapabilityMissingError({
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
                throw buildCapabilityMissingError({
                    capability: "connect",
                    integrationId: integration.id,
                    message: "This integration cannot be connected yet.",
                });
            }

            if (integration.behaviors.connect.kind === "rss-manage") {
                return { refresh: false, successMessage: null };
            }

            await executeConnectBehavior(integration.behaviors.connect);

            return { refresh: false, successMessage: null };
        }
        case "copy": {
            if (!integration.behaviors.copy) {
                throw buildCapabilityMissingError({
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
                throw buildCapabilityMissingError({
                    capability: "sync",
                    integrationId: integration.id,
                    message: "This integration cannot sync yet.",
                });
            }

            if (integration.behaviors.sync.kind === "route") {
                const successMessage = await executeRouteSyncBehavior(
                    integration.behaviors.sync
                );
                return { refresh: true, successMessage };
            }

            const successMessage = await executeGooglePhotosPickerFlow();
            return { refresh: true, successMessage };
        }
        default:
            return { refresh: false, successMessage: null };
    }
}

function useIntegrationAction({
    direction,
    id,
    isConnected,
}: UseIntegrationActionArgs): UseIntegrationActionResult {
    const router = useRouter();
    const isExtensionInstalled = useIsExtensionInstalled();
    const integration = getIntegration(id);

    const [status, setStatus] = React.useState<IntegrationActionStatus | null>(
        null
    );
    const [pendingRole, setPendingRole] =
        React.useState<IntegrationActionRole | null>(null);

    const handleAction = useStableCallback(
        async (role: IntegrationActionRole) => {
            setStatus(null);
            setPendingRole(role);

            if (
                integration.behaviors.connect?.kind === "rss-manage" &&
                role === "connect"
            ) {
                openRssManageDialog();
                setPendingRole(null);
                return;
            }

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
                log.error("Integration action failed", {
                    direction,
                    error,
                    integrationId: integration.id,
                    role,
                });

                setStatus({
                    message: getErrorMessage(
                        error,
                        "Could not complete this integration action."
                    ),
                    tone: "error",
                });
            } finally {
                setPendingRole((current) =>
                    current === role ? null : current
                );
            }
        }
    );

    const actions: IntegrationActionViewModel[] = [];

    for (const action of integration.actions) {
        if (action.for !== direction || !isActionVisible(action, isConnected)) {
            continue;
        }
        actions.push({
            isLoading: pendingRole === action.role,
            label: resolveActionLabel({
                connectBehavior: integration.behaviors.connect,
                isConnected,
                isExtensionInstalled,
                label: action.label,
                openBehavior: integration.behaviors.open,
                role: action.role,
            }),
            onClick: () => handleAction(action.role),
            role: action.role,
        } satisfies IntegrationActionViewModel);
    }

    return { actions, status };
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
    connectedCount,
    render,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
    connectedCount: number;
}) {
    const { isIntegrationsListOpen } = useIntegrationsListStore();

    return (
        <PreviewCard>
            <PreviewCardTrigger
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
                <span className="min-w-0 text-xs">{children}</span>
                <ChevronDownFilledIcon
                    aria-hidden
                    className="-ml-0.5"
                    focusable="false"
                />
                <HighlightIn className="absolute right-2 text-[11px] text-muted-foreground group-hover:hidden">
                    {connectedCount} connected
                </HighlightIn>
                <Kbd className="ml-auto bg-transparent opacity-0 group-hover:opacity-50 group-has-data-open/collapsible:hidden">
                    <CmdKbd />I
                </Kbd>
            </PreviewCardTrigger>
            <PreviewCardPopup
                align="start"
                className="flex flex-col p-0"
                positionMethod="fixed"
                side="right"
            >
                <Image
                    alt=""
                    aria-hidden
                    priority
                    sizes="400px"
                    src={IntegrationsPreviewImage}
                />
                <div className="m-3 flex max-w-64 flex-col gap-2">
                    <h2 className="font-medium text-sm">
                        Import from other apps
                    </h2>
                    <p className="text-foreground text-xs">
                        Sync your bookmarks from other services into your
                        library.
                    </p>
                </div>
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function IntegrationsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

function IntegrationsListPrivacyDisclaimer() {
    const [isOpen, setIsOpen] = React.useState(true);

    const handleDismiss = useStableCallback(() => setIsOpen(false));

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
                        onClick={handleDismiss}
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
                                prefetch={false}
                                rel="noopener"
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
    description,
    direction = "source",
    Icon,
    integrationId,
    isConnected,
    label,
    ...props
}: IntegrationsListItemProps) {
    const { actions, status } = useIntegrationAction({
        direction,
        id: integrationId,
        isConnected,
    });

    const primaryAction = actions[0];

    const handleClick = useStableCallback(() => {
        primaryAction?.onClick();
    });

    return (
        <IntegrationsListItemPreviewTrigger
            integrationId={integrationId}
            onClick={handleClick}
            render={
                <SidebarItem
                    {...props}
                    className={cn("gap-2.5 py-0.5 opacity-100", className)}
                    tabIndex={actions.length > 0 ? 0 : undefined}
                >
                    <Avatar aria-label={label} className="size-6 rounded-md">
                        <AvatarFallback className="rounded-md">
                            <Icon
                                aria-hidden
                                className="size-3.5 shrink-0"
                                focusable="false"
                            />
                        </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 font-medium text-sm leading-snug">
                        {label}
                    </span>
                    <span className="grid items-center text-muted-foreground leading-snug">
                        <span className="text-right text-[11px] opacity-0 [grid-area:1/1] sm:opacity-100 sm:group-hover:opacity-0 sm:group-focus-within:opacity-0">
                            {description}
                        </span>
                        <IntegrationsListItemActions
                            actions={actions}
                            className="opacity-100 [grid-area:1/1] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            integrationId={integrationId}
                            status={status}
                        />
                    </span>
                </SidebarItem>
            }
        />
    );
}

function IntegrationsListItemPreviewTrigger({
    integrationId,
    onClick,
    render,
}: IntegrationsListItemPreviewTriggerProps) {
    const integration = getIntegration(integrationId);
    const [isHovered, setIsHovered] = React.useState(false);

    const handleClick = useStableCallback(() => {
        setIsHovered(false);
        onClick?.();
    });

    return (
        <PreviewCard onOpenChange={setIsHovered} open={isHovered}>
            <PreviewCardTrigger
                closeDelay={0}
                onClick={handleClick}
                render={render}
            />
            <PreviewCardPopup
                className="flex flex-col p-0"
                positionMethod="fixed"
                side="right"
            >
                {integration.hintImage ? (
                    <Image
                        alt=""
                        className="aspect-3/2 h-auto w-full object-cover"
                        fill
                        sizes="256px"
                        src={integration.hintImage}
                    />
                ) : null}
                <p className="p-3 text-xs leading-tight">{integration.hint}</p>
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function IntegrationsListItemActions({
    actions,
    status,
    className,
    integrationId,
    ...props
}: IntegrationsListItemActionsProps) {
    if (actions.length === 0) {
        return null;
    }

    return (
        <div
            {...props}
            className={cn(
                "-mr-2.5 flex min-w-0 shrink-0 items-center justify-end gap-1",
                className
            )}
        >
            <IntegrationsListStatus tone={status?.tone}>
                {status?.message}
            </IntegrationsListStatus>
            {actions.map((action) => (
                <IntegrationsListItemActionButton
                    action={action}
                    key={`${integrationId}-${action.role}`}
                />
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
            {...props}
            aria-atomic="true"
            aria-live={isError ? "assertive" : "polite"}
            className={cn(
                "max-w-full text-right text-xs leading-tight",
                isError ? "text-destructive" : "text-muted-foreground",
                className
            )}
            role={isError ? "alert" : "status"}
        />
    );
}

function IntegrationsListItemActionButton({
    action,
}: IntegrationsListItemActionButtonProps) {
    const handleClick = useStableCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        action.onClick();
    });

    return (
        <Button
            className="rounded-full text-xs!"
            isLoading={action.isLoading}
            onClick={handleClick}
            size="sm"
            variant="ghost"
        >
            {action.label}
        </Button>
    );
}
