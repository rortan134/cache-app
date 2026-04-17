"use client";

import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/cn";
import type {
    IntegrationActionIcon,
    IntegrationDirection,
    IntegrationId,
} from "@/lib/integrations/support";
import { useIntegrationAction } from "@/lib/integrations/use-integration-action";
import { Images, Info, RefreshCw } from "lucide-react";
import * as React from "react";

export function IntegrationsList(
    props: React.ComponentProps<typeof Collapsible>
) {
    return <Collapsible defaultOpen {...props} />;
}

export function IntegrationsListTrigger({
    className,
    ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
    return (
        <CollapsibleTrigger
            className={cn(
                "flex select-none items-center gap-1.5 rounded-full bg-muted/94 px-3 py-2 text-left text-foreground leading-none hover:bg-input/50 active:bg-input/30",
                className
            )}
            {...props}
        />
    );
}

export function IntegrationsListPanel(
    props: React.ComponentProps<typeof CollapsiblePanel>
) {
    return <CollapsiblePanel {...props} />;
}

export function IntegrationsListNoticeCallout() {
    const [isConnectAccountNoteOpen, setIsConnectAccountNoteOpen] =
        React.useState(true);

    return (
        <Collapsible
            onOpenChange={setIsConnectAccountNoteOpen}
            open={isConnectAccountNoteOpen}
        >
            <CollapsiblePanel className="mt-1.5">
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
                        </Button>
                    </p>
                </div>
            </CollapsiblePanel>
        </Collapsible>
    );
}

export function IntegrationsListItem(props: React.ComponentProps<"div">) {
    return (
        <div className="flex items-center gap-2 pt-1 first:mt-3" {...props} />
    );
}

/** @internal */
function IntegrationActionIconGlyph({
    icon,
}: Readonly<{
    icon?: IntegrationActionIcon;
}>) {
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
        <div className="ml-auto flex flex-col items-start gap-1.5">
            {actions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                    {actions.map((action) => (
                        <Button
                            aria-label={
                                action.size === "icon"
                                    ? action.label
                                    : undefined
                            }
                            key={`${id}-${direction}-${action.role}`}
                            loading={action.isLoading}
                            onClick={action.onClick}
                            size={action.size}
                            type="button"
                            variant={action.variant}
                        >
                            <IntegrationActionIconGlyph icon={action.icon} />
                            {action.size === "icon" ? null : action.label}
                        </Button>
                    ))}
                </div>
            ) : null}
            {errorMessage ? (
                <p
                    aria-live="polite"
                    className="max-w-56 text-destructive text-xs leading-tight"
                    role="alert"
                >
                    {errorMessage}
                </p>
            ) : null}
            {successMessage ? (
                <p
                    aria-live="polite"
                    className="max-w-56 text-emerald-600 text-xs leading-tight"
                    role="status"
                >
                    {successMessage}
                </p>
            ) : null}
        </div>
    );
}
