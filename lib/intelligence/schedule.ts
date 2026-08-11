import "server-only";

import { after } from "next/server";
import { autoTagLibraryItemsByIds } from "@/lib/intelligence";

/**
 * Uses `after()` so it only works inside Next.js route handlers or server actions.
 */
export function scheduleSmartCollections(
    userId: string,
    itemIds: string[]
): void {
    if (itemIds.length === 0) {
        return;
    }
    after(async () => {
        await autoTagLibraryItemsByIds({ itemIds, userId });
    });
}
