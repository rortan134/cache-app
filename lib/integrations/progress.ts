import {
    type IntegrationId,
    integrationOwnsLibraryItemSource,
    listSyncableIntegrations,
} from "@/lib/integrations/support";
import type { LibraryItemSource } from "@/prisma/client/enums";

const SIGNUP_PROGRESS_BASELINE_PERCENT = 10;

export function integrationSetupProgressPercent(
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

export function syncableLibrarySourceTotal(): number {
    return listSyncableIntegrations().length;
}

export function partitionLibrarySyncLabels(
    items: { source: LibraryItemSource }[],
    connectedIntegrationIds: IntegrationId[] = []
): { connectedLabels: string[]; missingLabels: string[] } {
    const connectedLabels: string[] = [];
    const missingLabels: string[] = [];
    const connectedIntegrationIdSet = new Set(connectedIntegrationIds);
    const itemSources = new Set(items.map((item) => item.source));

    for (const integration of listSyncableIntegrations()) {
        const hasItems = [...itemSources].some((source) =>
            integrationOwnsLibraryItemSource(integration.id, source)
        );

        if (hasItems || connectedIntegrationIdSet.has(integration.id)) {
            connectedLabels.push(integration.label);
        } else {
            missingLabels.push(integration.label);
        }
    }

    return { connectedLabels, missingLabels };
}

export function integrationSetupHeadingText(args: {
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
