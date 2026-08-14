"use client";

import { useRefWithInit } from "@base-ui/utils/useRefWithInit";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T, Var } from "gt-next";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";
import {
    MarkdownImportDialog,
    openMarkdownImportDialog,
} from "@/components/library/markdown";
import { openRssManageDialog, RssManageDialog } from "@/components/library/rss";
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
    type ExtensionOpenBehavior,
    INTEGRATIONS,
    type IntegrationActionRole,
    type IntegrationDirection,
    type IntegrationId,
    listIntegrationActions,
    type OAuthLinkConnectBehavior,
    type RssManageConnectBehavior,
    type SocialSignInConnectBehavior,
    type SupportedIntegration,
    type SupportedIntegrationAction,
} from "@/lib/integrations/support";
import IntegrationsPreviewImage from "@/public/integrations-preview.webp";

const INTEGRATIONS_LIST_OPEN_STORAGE_KEY = "cache:integrations:list-open";

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

interface UseIntegrationActionsArgs {
    direction: IntegrationDirection;
    integration: SupportedIntegration;
    isConnected: boolean;
    isExtensionInstalled: boolean;
}

interface UseIntegrationActionsResult {
    actionStatus: IntegrationActionStatus | null;
    actions: IntegrationActionViewModel[];
}

const log = createLogger("library:integrations");

export const { useStore: useIntegrationsListStore } = createStore({
    isIntegrationsListOpen: storage(true, {
        storageKey: INTEGRATIONS_LIST_OPEN_STORAGE_KEY,
    }),
});

function useIntegrationActions({
    direction,
    integration,
    isExtensionInstalled,
    isConnected,
}: UseIntegrationActionsArgs): UseIntegrationActionsResult {
    const router = useRouter();

    const [actionStatus, setActionStatus] =
        React.useState<IntegrationActionStatus | null>(null);

    // synchronous guard so a same-role click is blocked before the state
    // update commits
    const activeActionRoles = useRefWithInit(() => {
        let roles = new Set<IntegrationActionRole>();
        const listeners = new Set<() => void>();
        const notify = () => {
            for (const listener of listeners) {
                listener();
            }
        };
        return {
            add(role: IntegrationActionRole) {
                if (!roles.has(role)) {
                    roles = new Set(roles);
                    roles.add(role);
                    notify();
                }
            },
            delete(role: IntegrationActionRole) {
                if (!roles.has(role)) {
                    return;
                }
                roles = new Set(roles);
                roles.delete(role);
                notify();
            },
            getSnapshot() {
                return roles;
            },
            has(role: IntegrationActionRole) {
                return roles.has(role);
            },
            subscribe(listener: () => void) {
                listeners.add(listener);
                return () => {
                    listeners.delete(listener);
                };
            },
        };
    }).current;

    const actionLoadingRoles = React.useSyncExternalStore(
        activeActionRoles.subscribe,
        activeActionRoles.getSnapshot,
        activeActionRoles.getSnapshot
    );

    const handleIntegrationAction = useStableCallback(
        async (role: IntegrationActionRole) => {
            if (activeActionRoles.has(role)) {
                return;
            }

            setActionStatus(null);
            activeActionRoles.add(role);

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
                    setActionStatus({
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

                setActionStatus({
                    message: getErrorMessage(
                        error,
                        "Could not complete this integration action."
                    ),
                    tone: "error",
                });
            } finally {
                activeActionRoles.delete(role);
            }
        }
    );

    const integrationActions = listIntegrationActions(
        integration.id,
        direction
    );
    const visibleActions: IntegrationActionViewModel[] = [];

    for (const action of integrationActions) {
        if (!isActionVisible(action, isConnected)) {
            continue;
        }
        visibleActions.push({
            isLoading: actionLoadingRoles.has(action.role),
            label: resolveActionLabel({
                connectBehavior: integration.behaviors.connect,
                isConnected,
                isExtensionInstalled,
                label: action.label,
                openBehavior: integration.behaviors.open,
                role: action.role,
            }),
            onClick: () => handleIntegrationAction(action.role),
            role: action.role,
        } satisfies IntegrationActionViewModel);
    }

    return { actionStatus, actions: visibleActions };
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
}) {
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
            return "Copy prompt";
        case "import":
            return "Import";
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
    capability: IntegrationActionRole;
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
}) {
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
                openRssManageDialog();
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
        case "import":
            if (integration.id === "markdown") {
                openMarkdownImportDialog();
                return { refresh: false, successMessage: null };
            }

            throw buildCapabilityMissingError({
                capability: "import",
                integrationId: integration.id,
                message: "This integration cannot be imported yet.",
            });
        default:
            return ((_: never) => _)(role);
    }
}

interface IntegrationsProps {
    connectedIntegrations: Set<IntegrationId>;
}

export function Integrations({ connectedIntegrations }: IntegrationsProps) {
    return (
        <IntegrationsList data-sidebar-collapsible="">
            <IntegrationsListTrigger
                connectedCount={connectedIntegrations.size}
            >
                <T>Integrations</T>
            </IntegrationsListTrigger>
            <IntegrationsListPanel>
                <IntegrationsListContent>
                    {(integration) => (
                        <IntegrationsListItem
                            direction={
                                integration.source ? "source" : "destination"
                            }
                            integration={integration}
                            isConnected={connectedIntegrations.has(
                                integration.id
                            )}
                            key={integration.id}
                        />
                    )}
                </IntegrationsListContent>
                <IntegrationsListDisclaimer />
                <RssManageDialog />
                <MarkdownImportDialog />
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
            className={cn("group/collapsible relative", className)}
            onOpenChange={setIsIntegrationsListOpen}
            open={isIntegrationsListOpen}
        />
    );
}

interface IntegrationsListTriggerProps
    extends React.ComponentProps<typeof CollapsibleTrigger> {
    connectedCount: number;
}

function IntegrationsListTrigger({
    children,
    connectedCount,
    render,
    ...props
}: IntegrationsListTriggerProps) {
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
                    <T>
                        <Var>{connectedCount}</Var> connected
                    </T>
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
                        <T>Import from other apps</T>
                    </h2>
                    <p className="text-foreground text-xs">
                        <T>
                            Sync your bookmarks from other services into your
                            library.
                        </T>
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

interface IntegrationsListContentProps {
    children: (
        integration: SupportedIntegration,
        index: number
    ) => React.ReactNode;
}

function IntegrationsListContent({ children }: IntegrationsListContentProps) {
    return (
        <DisclosureListVertical
            maxVisible={6}
            triggerProps={{ className: "ml-1.25" }}
        >
            {INTEGRATIONS.map(children)}
        </DisclosureListVertical>
    );
}

interface IntegrationsListItemProps
    extends React.ComponentProps<typeof IntegrationsListItemPreviewTrigger> {
    direction?: IntegrationDirection;
    isConnected: boolean;
}

function IntegrationsListItem({
    direction = "source",
    integration,
    isConnected,
    ...props
}: IntegrationsListItemProps) {
    const isExtensionInstalled = useIsExtensionInstalled();
    const { actionStatus, actions } = useIntegrationActions({
        direction,
        integration,
        isConnected,
        isExtensionInstalled,
    });
    const [primaryAction] = actions;
    const isPrimaryActionLoading = primaryAction?.isLoading ?? false;
    const IntegrationIcon = integration.Icon;

    const handleClick = useStableCallback(() => {
        if (isPrimaryActionLoading) {
            return;
        }
        primaryAction?.onClick();
    });

    return (
        <IntegrationsListItemPreviewTrigger
            {...props}
            integration={integration}
            onClick={handleClick}
            render={
                <SidebarItem
                    aria-disabled={isPrimaryActionLoading}
                    className="opacity-100"
                    role={primaryAction ? "button" : undefined}
                    tabIndex={primaryAction ? 0 : undefined}
                />
            }
        >
            <Avatar
                aria-label={integration.label}
                className="size-6 rounded-md"
            >
                <AvatarFallback className="rounded-md">
                    <IntegrationIcon
                        aria-hidden
                        className="size-3.5 shrink-0"
                        focusable="false"
                    />
                </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 font-medium text-sm leading-snug">
                {integration.label}
            </span>
            <div className="pointer-events-none grid w-fit items-center justify-self-end text-muted-foreground leading-snug [grid-area:1/1]">
                <span className="text-right text-[11px] opacity-0 [grid-area:1/1] sm:opacity-100 sm:group-hover:opacity-0 sm:group-focus-within:opacity-0">
                    {integration.description}
                </span>
                <IntegrationsListItemActions
                    actionStatus={actionStatus}
                    actions={actions}
                    className="pointer-events-auto opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100"
                >
                    {(action) => (
                        <IntegrationsListItemActionButton
                            action={action}
                            key={action.role}
                        />
                    )}
                </IntegrationsListItemActions>
            </div>
        </IntegrationsListItemPreviewTrigger>
    );
}

interface IntegrationsListItemPreviewTriggerProps
    extends React.ComponentProps<typeof PreviewCardTrigger> {
    integration: SupportedIntegration;
}

function IntegrationsListItemPreviewTrigger({
    integration,
    ...props
}: IntegrationsListItemPreviewTriggerProps) {
    return (
        <PreviewCard>
            <PreviewCardTrigger {...props} />
            <PreviewCardPopup
                className="flex flex-col p-0"
                positionMethod="fixed"
                side="right"
            >
                {integration.hintImage ? (
                    <div className="relative aspect-3/2 w-full shrink-0">
                        <Image
                            alt=""
                            className="object-cover"
                            fill
                            sizes="256px"
                            src={integration.hintImage}
                        />
                    </div>
                ) : null}
                <p className="p-3 text-xs leading-tight">{integration.hint}</p>
            </PreviewCardPopup>
        </PreviewCard>
    );
}

interface IntegrationsListItemActionsProps
    extends Omit<React.ComponentProps<"div">, "children"> {
    actionStatus: IntegrationActionStatus | null;
    actions: IntegrationActionViewModel[];
    children: (
        action: IntegrationActionViewModel,
        index: number
    ) => React.ReactNode;
}

function IntegrationsListItemActions({
    actions,
    actionStatus,
    className,
    children,
    ...props
}: IntegrationsListItemActionsProps) {
    if (!actions.length) {
        return null;
    }

    return (
        <div
            {...props}
            className={cn(
                "z-10 -mr-2.5 flex w-fit min-w-0 shrink-0 items-center justify-end justify-self-end [grid-area:1/1]",
                className
            )}
        >
            <IntegrationsListActionStatus tone={actionStatus?.tone}>
                {actionStatus?.message}
            </IntegrationsListActionStatus>
            {actions.map(children)}
        </div>
    );
}

interface IntegrationsListActionStatusProps extends React.ComponentProps<"p"> {
    tone?: IntegrationActionStatusTone;
}

function IntegrationsListActionStatus({
    tone = "success",
    className,
    ...props
}: IntegrationsListActionStatusProps) {
    const isError = tone === "error";

    if (!props.children) {
        return null;
    }

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

interface IntegrationsListItemActionButtonProps {
    action: IntegrationActionViewModel;
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

function IntegrationsListDisclaimer() {
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
                    <T>
                        Only connect accounts you trust. Cache can access what
                        you choose to save with connected apps. You can always
                        change your mind.
                    </T>{" "}
                    <Button
                        className="h-fit! px-0 leading-tight sm:text-[11px]"
                        onClick={handleDismiss}
                        size="xs"
                        variant="link"
                    >
                        <T>Dismiss</T>
                    </Button>{" "}
                    <T>or</T>{" "}
                    <Button
                        className="h-fit! px-0 leading-tight sm:text-[11px]"
                        nativeButton={false}
                        render={
                            <Link
                                href="/legal/privacy-policy"
                                prefetch={false}
                                rel="noopener noreferrer"
                                target="_blank"
                            />
                        }
                        size="xs"
                        variant="link"
                    >
                        <T>Cache Privacy</T>
                        <ArrowUpRight className="inline-block size-3 shrink-0 text-muted-foreground" />
                    </Button>
                </p>
            </CollapsiblePanel>
        </Collapsible>
    );
}
