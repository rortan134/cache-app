import { ChevronDownFilledIcon } from "@/components/ui/integration-icons";
import { RadialChart } from "@/components/ui/radial-chart";
import {
    getIntegration,
    type IntegrationId,
    LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS,
} from "@/lib/integrations/supports";
import { cn } from "@/lib/utils";
import type { LibraryItemSource } from "@/prisma/client/enums";

const SIGNUP_PROGRESS_BASELINE_PERCENT = 10;

function integrationSetupProgressPercent(
    connectedCount: number,
    syncable: number
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
    source: LibraryItemSource
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
    connectedIntegrationIds: IntegrationId[] = []
): { connectedLabels: string[]; missingLabels: string[] } {
    const connectedLabels: string[] = [];
    const missingLabels: string[] = [];
    const connectedIntegrationIdSet = new Set(connectedIntegrationIds);
    for (const id of LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS) {
        const count = items.filter((item) =>
            integrationMatchesSource(id, item.source)
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
    return "You're all set — keep your library in sync";
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
        connectedIntegrationIds
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
        syncable
    );

    return (
        <button
            {...props}
            className={cn(
                "flex select-none items-center gap-2 rounded-full bg-muted/94 px-3 py-2 text-left text-foreground hover:bg-input/50",
                className
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

export { IntegrationsSetupWizardButton };
