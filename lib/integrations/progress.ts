import {
    getIntegration,
    type IntegrationId,
    LIBRARY_BOOKMARK_SYNC_INTEGRATION_IDS,
} from "@/lib/integrations/support";
import type { LibraryItemSource } from "@/prisma/client/enums";

const SIGNUP_PROGRESS_BASELINE_PERCENT = 10;

export function integrationSetupProgressPercent(
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

export function syncableLibrarySourceTotal(): number {
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

export function partitionLibrarySyncLabels(
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
