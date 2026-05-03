import "server-only";

import { autoTagLibraryItemsByIds } from "@/lib/collections/intelligence";
import { after } from "next/server";

/**
 * Schedules background auto-tagging for newly imported items.
 *
 * Uses `after()` so it only works inside Next.js route handlers or server actions.
 */
export function scheduleAutoTagging(userId: string, itemIds: string[]): void {
    if (itemIds.length === 0) {
        return;
    }

    after(async () => {
        await autoTagLibraryItemsByIds({ itemIds, userId });
    });
}
