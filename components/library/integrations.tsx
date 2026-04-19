"use client";

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
import { cn } from "@/lib/cn";
import type {
    IntegrationActionIcon,
    IntegrationDirection,
    IntegrationId,
} from "@/lib/integrations/support";
import { useIntegrationAction } from "@/lib/integrations/use-integration-action";
import IntegrationsPreviewImage from "@/public/integrations-preview.webp";
import { ArrowUpRight, Images, Info, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { createStore } from "stan-js";
import { storage } from "stan-js/storage";

const { useStore: useIntegrationsListState } = createStore({
    isIntegrationsListOpen: storage(true),
});

export function IntegrationsList(
    props: React.ComponentProps<typeof Collapsible>
) {
    const { isIntegrationsListOpen, setIsIntegrationsListOpen } =
        useIntegrationsListState();
    const { onOpenChange, open, ...restProps } = props;
    const isControlled = open !== undefined;

    return (
        <Collapsible
            defaultOpen={isControlled ? undefined : isIntegrationsListOpen}
            onOpenChange={(nextOpen, eventDetails) => {
                if (!isControlled) {
                    setIsIntegrationsListOpen(nextOpen);
                }
                onOpenChange?.(nextOpen, eventDetails);
            }}
            open={isControlled ? open : isIntegrationsListOpen}
            {...restProps}
        />
    );
}

export function IntegrationsListTrigger({
    className,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    const { isIntegrationsListOpen } = useIntegrationsListState();

    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        className={cn(
                            "flex select-none items-center gap-2 rounded-full bg-muted/94 px-3 py-2 text-left text-foreground leading-none hover:bg-input/50 active:bg-input/30",
                            className
                        )}
                        {...props}
                    />
                }
            />
            <PopoverPopup
                align="start"
                className={cn({
                    "pointer-events-none! hidden!": isIntegrationsListOpen,
                })}
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

export function IntegrationsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

export function IntegrationsListActionButton({
    className,
    variant = "ghost",
    ...props
}: React.ComponentProps<typeof Button>) {
    return (
        <Button
            className={cn("rounded-full", className)}
            type="button"
            variant={variant}
            {...props}
        />
    );
}

export function IntegrationsListNoticeCallout() {
    const [isConnectAccountNoteOpen, setIsConnectAccountNoteOpen] =
        React.useState(true);

    return (
        <Collapsible
            className="mt-2"
            onOpenChange={setIsConnectAccountNoteOpen}
            open={isConnectAccountNoteOpen}
        >
            <CollapsiblePanel>
                <div className="flex gap-1.5">
                    <Info className="mt-0.5 inline-block size-3.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-tight">
                        Please only connect accounts you trust. Cache can access
                        what you choose to save with connected apps. You can
                        always change your mind.
                        <Button
                            className="h-fit! leading-tight sm:text-[11px]"
                            onClick={() => setIsConnectAccountNoteOpen(false)}
                            size="xs"
                            type="button"
                            variant="link"
                        >
                            Dismiss
                        </Button>{" "}
                        or{" "}
                        <Button
                            className="h-fit! leading-tight sm:text-[11px]"
                            render={
                                <Link
                                    href="/legal/privacy-policy"
                                    target="_blank"
                                />
                            }
                            size="xs"
                            type="button"
                            variant="link"
                        >
                            Cache Privacy
                            <ArrowUpRight className="inline-block size-3 text-muted-foreground" />
                        </Button>
                    </p>
                </div>
            </CollapsiblePanel>
        </Collapsible>
    );
}

export function IntegrationsListItem({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("flex items-center gap-2 pt-1 first:mt-3", className)}
            {...props}
        />
    );
}

export function IntegrationsListStatus({
    tone = "success",
    className,
    ...props
}: React.ComponentProps<"p"> & {
    tone?: "error" | "success";
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

export function IntegrationsListEmpty({
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
            No integrations are available right now.
        </p>
    );
}

/** @internal */
function IntegrationActionIconGlyph({
    icon,
}: {
    icon?: IntegrationActionIcon;
}) {
    if (icon === "images") {
        return <Images className="size-4" />;
    }
    if (icon === "refresh") {
        return <RefreshCw className="size-4" />;
    }
    return null;
}

interface IntegrationsListItemActionProps {
    direction?: IntegrationDirection;
    id: IntegrationId;
    isConnected: boolean;
}

export function IntegrationsListItemAction({
    direction = "source",
    id,
    isConnected,
}: IntegrationsListItemActionProps) {
    const { actions, errorMessage, successMessage } = useIntegrationAction({
        direction,
        id,
        isConnected,
    });

    if (actions.length === 0 && !errorMessage && !successMessage) {
        return null;
    }

    return (
        <div className="ml-auto flex flex-col items-start gap-1">
            <div className="flex flex-wrap items-center gap-1">
                {actions.map((action) => (
                    <IntegrationsListActionButton
                        aria-label={
                            action.size === "icon" ? action.label : undefined
                        }
                        key={`${id}-${direction}-${action.role}`}
                        loading={action.isLoading}
                        onClick={action.onClick}
                        size={action.size}
                        variant={action.variant}
                    >
                        <IntegrationActionIconGlyph icon={action.icon} />
                        {action.size === "icon" ? null : action.label}
                    </IntegrationsListActionButton>
                ))}
            </div>
            <IntegrationsListStatus tone="error">
                {errorMessage}
            </IntegrationsListStatus>
            <IntegrationsListStatus tone="success">
                {successMessage}
            </IntegrationsListStatus>
        </div>
    );
}
