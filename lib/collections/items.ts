"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { extractNamedErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import type { LibraryCollectionTag } from "@/lib/common/types";
import * as z from "zod";
import { LibraryCollectionError } from "./error";
import * as service from "./service";

const log = createLogger("library:actions:items");

const UpdateLibraryItemCollectionsInputSchema = z.object({
    collectionIds: z.array(z.string().trim().min(1)).max(100),
    itemId: z.string().trim().min(1),
});

export type DeleteLibraryItemResult =
    | {
          itemId: string;
          status: "DELETED";
      }
    | {
          message: string;
          status: "ERROR" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type UpdateLibraryItemCollectionsResult =
    | {
          collections: LibraryCollectionTag[];
          itemId: string;
          status: "UPDATED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export async function deleteLibraryItem(
    itemId: string
): Promise<DeleteLibraryItemResult> {
    const normalizedItemId = itemId.trim();
    if (normalizedItemId.length === 0) {
        return {
            message: "Select a saved item before trying to delete it.",
            status: "ERROR",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to manage saved items.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const id = await service.deleteLibraryItem({
            itemId: normalizedItemId,
            userId,
        });

        return {
            itemId: id,
            status: "DELETED",
        };
    } catch (error) {
        const named = extractNamedErrorMessage(error);
        if (
            LibraryCollectionError.isInstance(error) &&
            error.data.code === "not_found"
        ) {
            return {
                message: named.message,
                status: "NOT_FOUND",
            };
        }

        log.error("Unexpected library item delete failure", error);
        return {
            message: "We couldn't delete this saved item right now.",
            status: "ERROR",
        };
    }
}

export async function updateLibraryItemCollections(input: {
    collectionIds: string[];
    itemId: string;
}): Promise<UpdateLibraryItemCollectionsResult> {
    const parsed = UpdateLibraryItemCollectionsInputSchema.safeParse({
        collectionIds: Array.from(new Set(input.collectionIds)),
        itemId: input.itemId,
    });

    if (!parsed.success) {
        return {
            message: "Pick valid collections before saving.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to manage collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const result = await service.updateLibraryItemCollections({
            collectionIds: parsed.data.collectionIds,
            itemId: parsed.data.itemId,
            userId,
        });

        return {
            ...result,
            status: "UPDATED",
        };
    } catch (error) {
        const named = extractNamedErrorMessage(error);
        if (
            LibraryCollectionError.isInstance(error) &&
            error.data.code === "not_found"
        ) {
            return {
                message: named.message,
                status: "NOT_FOUND",
            };
        }

        log.error("Unexpected library collection update failure", error);
        return {
            message: "We couldn't update collections for this item.",
            status: "ERROR",
        };
    }
}
