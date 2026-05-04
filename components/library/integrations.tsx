"use client";

import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Popover,
    PopoverDescription,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarItem } from "@/components/ui/sidebar";
import { useIntegrationAction } from "@/hooks/use-integration-action";
import { useListPanelOpenState } from "@/hooks/use-list-panel-open-state";
import { cn } from "@/lib/common/cn";
import type {
    IntegrationActionIcon,
    IntegrationDirection,
    IntegrationId,
} from "@/lib/integrations/support";
import IntegrationsPreviewImage from "@/public/integrations-preview.webp";
import { ArrowUpRight, Images, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { createScopedStore } from "stan-js";
import { storage } from "stan-js/storage";

const INTEGRATION_ACTION_ICON_BY_NAME: Record<
    IntegrationActionIcon,
    React.ComponentType<{ className?: string }>
> = {
    images: Images,
    refresh: RefreshCw,
};

const {
    StoreProvider: IntegrationsListProvider,
    useStore: useIntegrationsListStore,
} = createScopedStore({
    isIntegrationsListPanelOpen: storage(true),
});

/**
 * Read and toggle the open state of the integrations list panel.
 *
 * Stored in `stan-js` with local-storage persistence so the panel stays
 * in the same state across reloads.
 */
function useIntegrationsListOpenState() {
    const { isIntegrationsListPanelOpen, setIsIntegrationsListPanelOpen } =
        useIntegrationsListStore();

    return [
        isIntegrationsListPanelOpen,
        setIsIntegrationsListPanelOpen,
    ] as const;
}

/**
 * The root component of the integrations list.
 *
 * Provides a scoped store so that multiple instances do not share the same
 * open state. Wrap `IntegrationsListTrigger` and `IntegrationsListPanel`
 * inside it.
 */
export function IntegrationsList(
    props: React.ComponentProps<typeof Collapsible>
) {
    return (
        <IntegrationsListProvider>
            <IntegrationsListImpl {...props} />
        </IntegrationsListProvider>
    );
}

/**
 * Internal collapsible wrapper that wires the scoped store to the `open`
 * prop and the `mod+i` hotkey.
 *
 * Kept separate from `IntegrationsList` so the store provider and the
 * consumer are in distinct render layers, avoiding stale-closure issues.
 */
function IntegrationsListImpl({
    onOpenChange,
    open,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    const state = useIntegrationsListOpenState();
    const [isOpen, handleOpenChange] = useListPanelOpenState({
        hotkey: "mod+i",
        onOpenChange,
        open,
        state,
    });

    return (
        <Collapsible onOpenChange={handleOpenChange} open={isOpen} {...props} />
    );
}

/**
 * A button that toggles the integrations list panel.
 *
 * Renders a `Popover` around a `CollapsibleTrigger`. The popover displays a
 * preview image and description on hover, and is hidden while the panel is open
 * to avoid overlapping content.
 */
export function IntegrationsListTrigger(
    props: React.ComponentProps<typeof CollapsibleTrigger>
) {
    const [isOpen] = useIntegrationsListOpenState();

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        render={
                            <SidebarItem render={<button type="button" />} />
                        }
                        title={isOpen ? "Collapse panel" : "Expand panel"}
                        {...props}
                    />
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
                    loading="eager"
                    priority
                    src={IntegrationsPreviewImage}
                />
                <div className="mt-4 flex max-w-64 flex-col gap-2">
                    <PopoverTitle className="font-medium text-sm">
                        Places to return to.
                    </PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs">
                        Give your every bookmark more meaning.
                    </PopoverDescription>
                </div>
            </PopoverPopup>
        </Popover>
    );
}

/**
 * The collapsible panel that holds the list contents.
 *
 * Renders a `CollapsiblePanel`. Compose it inside `IntegrationsList`.
 */
export function IntegrationsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

/**
 * A small feedback prompt that lets users request missing integrations.
 *
 * Renders inside a `FeedbackWidget`.
 */
export function IntegrationsListFeedback() {
    return (
        <FeedbackWidget className="mx-2.5 mt-1.5 mb-0.5">
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

/**
 * A dismissible privacy notice for the integrations list.
 *
 * Reminds users to only connect accounts they trust. Starts open and can be
 * dismissed via an inline button. The dismiss state is local and resets on
 * page reload.
 */
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
                        <ArrowUpRight className="inline-block size-3 text-muted-foreground" />
                    </Button>
                </p>
            </CollapsiblePanel>
        </Collapsible>
    );
}

/**
 * A single row in the integrations list.
 *
 * Renders a `SidebarItem` with preset gap and padding.
 */
export function IntegrationsListItem({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <SidebarItem
            className={cn("gap-2.5 py-0.5 opacity-100", className)}
            {...props}
        />
    );
}

/**
 * The empty state shown when no integrations are available.
 *
 * Renders a `<p>` element with dashed border styling.
 */
export function IntegrationsListEmpty({
    children = "No integrations are available right now.",
    className,
    ...props
}: React.ComponentProps<"p">) {
    return (
        <p
            className={cn(
                "rounded-xl border border-border/30 border-dashed px-4 py-6 text-center text-muted-foreground text-xs",
                className
            )}
            {...props}
        >
            {children}
        </p>
    );
}

type IntegrationsListStatusTone = "error" | "success";

/**
 * Inline status line for integration actions.
 *
 * Returns `null` when `children` is empty so assistive technologies do not
 * announce silent updates.
 */
function IntegrationsListStatus({
    tone = "success",
    className,
    ...props
}: React.ComponentProps<"p"> & {
    tone?: IntegrationsListStatusTone;
}) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            aria-live="polite"
            className={cn(
                "text-xs leading-tight",
                tone === "error" ? "text-destructive" : "text-muted-foreground",
                className
            )}
            role={tone === "error" ? "alert" : "status"}
            {...props}
        />
    );
}

interface IntegrationsListItemActionProps {
    className?: string;
    direction?: IntegrationDirection;
    id: IntegrationId;
    isConnected: boolean;
}

/**
 * The action buttons and status messages for a single integration.
 *
 * Derives actions from `useIntegrationAction` and renders them as buttons,
 * followed by optional error and success statuses. Returns `null` when there
 * is nothing to display.
 */
export function IntegrationsListItemAction({
    direction = "source",
    id,
    isConnected,
    className,
}: IntegrationsListItemActionProps) {
    const { actions, errorMessage, successMessage } = useIntegrationAction({
        direction,
        id,
        isConnected,
    });
    const hasActions = actions.length > 0;

    if (!(hasActions || errorMessage || successMessage)) {
        return null;
    }

    return (
        <div
            className={cn("ml-auto flex flex-col items-end gap-0.5", className)}
        >
            {hasActions && (
                <div className="flex flex-wrap items-center gap-1">
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
                                    <ActionIcon className="size-4" />
                                )}
                                {!isIconOnly && action.label}
                            </Button>
                        );
                    })}
                </div>
            )}
            <IntegrationsListStatus tone="error">
                {errorMessage}
            </IntegrationsListStatus>
            <IntegrationsListStatus tone="success">
                {successMessage}
            </IntegrationsListStatus>
        </div>
    );
}
