"use client";

import { SidebarIntegrationAction } from "@/components/library/entry/sidebar-integration-action";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownFilledIcon } from "@/components/ui/integration-icons";
import { RadialChart } from "@/components/ui/radial-chart";
import { useExtensionInstalled } from "@/hooks/use-extension-installed";
import {
    getIntegration,
    type IntegrationId,
    INTEGRATIONS,
    LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS,
    type SupportedIntegration,
} from "@/lib/integrations/supports";
import { cn } from "@/lib/utils";
import type { LibraryItemSource } from "@/prisma/client/enums";
import { Info } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";

interface LibrarySidebarIntegrationsProps {
    items: { source: LibraryItemSource }[];
    parkedIntegrationIds?: IntegrationId[];
    serverConnectedIntegrationIds: IntegrationId[];
}

const EXTENSION_INTEGRATION_IDS = [
    "chrome",
    "instagram",
    "tiktok",
    "youtube",
] as const;
const SIGNUP_PROGRESS_BASELINE_PERCENT = 10;

function integrationSetupProgressPercent(
    connectedCount: number,
    syncable: number,
): number {
    if (syncable < 1) {
        return 0;
    }

    const clamped = Math.min(connectedCount, syncable);
    const integrationPortion =
        (clamped / syncable) * (100 - SIGNUP_PROGRESS_BASELINE_PERCENT);
    return Math.round(SIGNUP_PROGRESS_BASELINE_PERCENT + integrationPortion);
}

function syncableLibrarySourceTotal(): number {
    return LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS.length;
}

function integrationMatchesSource(
    id: IntegrationId,
    source: LibraryItemSource,
): boolean {
    if (id === "chrome") {
        return source === "chrome_bookmarks";
    }
    if (id === "x") {
        return source === "x_bookmarks";
    }
    if (id === "youtube") {
        return source === "youtube_watch_later";
    }
    return source === id;
}

function partitionLibrarySyncLabels(
    items: { source: LibraryItemSource }[],
    connectedIntegrationIds: IntegrationId[] = [],
): { connectedLabels: string[]; missingLabels: string[] } {
    const connectedLabels: string[] = [];
    const missingLabels: string[] = [];
    const connectedIntegrationIdSet = new Set(connectedIntegrationIds);

    for (const id of LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS) {
        const count = items.filter((item) =>
            integrationMatchesSource(id, item.source),
        ).length;
        const label = getIntegration(id).label;

        if (count > 0 || connectedIntegrationIdSet.has(id)) {
            connectedLabels.push(label);
        } else {
            missingLabels.push(label);
        }
    }

    return { connectedLabels, missingLabels };
}

function integrationSetupHeadingText(args: {
    syncable: number;
    connectedCount: number;
    connectedLabels: string[];
    missingLabels: string[];
}): string {
    const { syncable, connectedCount } = args;
    if (syncable < 1) {
        return "Connected accounts";
    }
    if (connectedCount === 0) {
        return "Get setup with your first account";
    }
    if (connectedCount < syncable) {
        return "Connect more platforms to unify your saved posts in one library";
    }
    return "You're all set - keep your library in sync";
}

interface IntegrationSetupHeadingProps extends React.ComponentProps<"button"> {
    connectedIntegrationIds?: IntegrationId[];
    items: { source: LibraryItemSource }[];
}

function IntegrationsSetupWizardButton({
    connectedIntegrationIds,
    items,
    className,
    ...props
}: IntegrationSetupHeadingProps) {
    const syncable = syncableLibrarySourceTotal();
    const { connectedLabels, missingLabels } = partitionLibrarySyncLabels(
        items,
        connectedIntegrationIds,
    );

    const connectedCount = connectedLabels.length;
    const text = integrationSetupHeadingText({
        connectedCount,
        connectedLabels,
        missingLabels,
        syncable,
    });
    const progressPercent = integrationSetupProgressPercent(
        connectedCount,
        syncable,
    );

    return (
        <button
            {...props}
            className={cn(
                "flex select-none items-center gap-1.5 rounded-full bg-muted/94 px-3 py-2 text-left text-foreground hover:bg-input/50 active:bg-input/20",
                className,
            )}
            type="button"
        >
            <span aria-hidden="true" className="shrink-0 leading-none">
                <RadialChart size={36} value={progressPercent} />
            </span>
            <span className="min-w-0 flex-1 font-medium text-sm leading-tight">
                {text}
            </span>
            <ChevronDownFilledIcon />
        </button>
    );
}

function isConnectedOnClient(args: {
    extensionInstalled: boolean;
    id: SupportedIntegration["id"];
    serverConnectedIds: ReadonlySet<IntegrationId>;
}) {
    const { extensionInstalled, id, serverConnectedIds } = args;
    if (serverConnectedIds.has(id)) {
        return true;
    }

    return (
        extensionInstalled &&
        (EXTENSION_INTEGRATION_IDS as readonly string[]).includes(id)
    );
}

function IntegrationsList({
    items,
    parkedIntegrationIds = [],
    serverConnectedIntegrationIds,
}: LibrarySidebarIntegrationsProps): ReactElement {
    const extensionInstalled = useExtensionInstalled();
    const parkedIntegrationIdSet = new Set(parkedIntegrationIds);
    const serverConnectedIds = new Set(serverConnectedIntegrationIds);
    const [isConnectAccountNoteOpen, setIsConnectAccountNoteOpen] =
        useState(true);
    const connectedIntegrationIds = INTEGRATIONS.flatMap(({ id }) =>
        isConnectedOnClient({ extensionInstalled, id, serverConnectedIds })
            ? [id]
            : [],
    );

    return (
        <Collapsible defaultOpen>
            <CollapsibleTrigger
                render={
                    <IntegrationsSetupWizardButton
                        connectedIntegrationIds={connectedIntegrationIds}
                        items={items}
                    />
                }
            />
            <CollapsiblePanel className="gap-2.5">
                {INTEGRATIONS.map(({ id, label, description, Icon }) => (
                    <div
                        className="flex items-center gap-2 pl-1 first:mt-3"
                        key={id}
                    >
                        <Avatar
                            aria-label={label}
                            className="size-9 rounded-lg ring-1 ring-border/60"
                        >
                            <AvatarFallback className="rounded-lg bg-card text-foreground">
                                <Icon aria-hidden className="size-5 shrink-0" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="font-medium text-sm">{label}</span>
                            <span className="text-[11px] text-muted-foreground leading-tight">
                                {description}
                            </span>
                        </div>
                        <SidebarIntegrationAction
                            connected={connectedIntegrationIds.includes(id)}
                            extensionInstalled={extensionInstalled}
                            id={id}
                            parked={parkedIntegrationIdSet.has(id)}
                        />
                    </div>
                ))}
                <Collapsible
                    onOpenChange={setIsConnectAccountNoteOpen}
                    open={isConnectAccountNoteOpen}
                >
                    <CollapsiblePanel className="mt-1.5 pl-1">
                        <div className="flex gap-1.5">
                            <Info className="mt-0.5 inline-block size-3.5 shrink-0" />
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                Please only connect accounts you trust. Cache
                                can access what you choose to save with
                                connected apps. You can always change your mind.
                                <Button
                                    className="h-fit! leading-tight sm:text-[11px]"
                                    onClick={() =>
                                        setIsConnectAccountNoteOpen(false)
                                    }
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
            </CollapsiblePanel>
        </Collapsible>
    );
}

export { IntegrationsList };
