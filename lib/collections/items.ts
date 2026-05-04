"use server";

import {
    STATUS_MAP_NOT_FOUND,
    uniqueStrings,
    type ActionError,
    type LibraryCollectionSummary,
    type LibraryCollectionTag,
} from "@/lib/collections/utils";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    handleActionError,
    requireActionUserId,
} from "@/lib/common/procedure";
import * as z from "zod";
import {
    BATCH_UPDATE_MAX_ITEMS,
    MAX_COLLECTIONS_PER_BATCH,
    MAX_COLLECTIONS_PER_ITEM,
} from "@/lib/common/constants";
import { LibraryCollectionError } from "./error";
import * as service from "./service";

const log = createLogger("library:actions:items");

const LibraryItemCollectionsUpdateInputSchema = z.object({
    collectionIds: z
        .array(z.string().trim().min(1))
        .max(MAX_COLLECTIONS_PER_ITEM),
    itemId: z.string().trim().min(1),
});

const LibraryItemsCollectionsUpdateInputSchema = z.object({
    itemIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(BATCH_UPDATE_MAX_ITEMS),
    nextSharedCollectionIds: z
        .array(z.string().trim().min(1))
        .max(MAX_COLLECTIONS_PER_BATCH),
    previousSharedCollectionIds: z
        .array(z.string().trim().min(1))
        .max(MAX_COLLECTIONS_PER_BATCH),
});

const LibraryItemDeleteInputSchema = z.object({
    itemId: z
        .string()
        .trim()
        .min(1, "Select a saved item before trying to delete it."),
});

export type LibraryItemDeleteResult =
    | {
          collectionSummaries: LibraryCollectionSummary[];
          itemId: string;
          status: "DELETED";
      }
    | ActionError;

export type LibraryItemCollectionsUpdateResult =
    | {
          collectionSummaries: LibraryCollectionSummary[];
          collections: LibraryCollectionTag[];
          itemId: string;
          status: "UPDATED";
      }
    | ActionError;

export type LibraryItemsCollectionsUpdateResult =
    | {
          collectionSummaries: LibraryCollectionSummary[];
          itemCollections: Array<{
              collections: LibraryCollectionTag[];
              itemId: string;
          }>;
          status: "UPDATED";
      }
    | ActionError;

export async function deleteLibraryItem(
    itemId: string
): Promise<LibraryItemDeleteResult> {
    const parsed = LibraryItemDeleteInputSchema.safeParse({ itemId });
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Select a saved item before trying to delete it."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage saved items."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        const result = await service.deleteLibraryItem({
            itemId: parsed.data.itemId,
            userId: auth.userId,
        });

        return {
            ...result,
            status: "DELETED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't delete this saved item right now.",
            log,
        });
    }
}

export async function updateLibraryItemsCollections(input: {
    itemIds: string[];
    nextSharedCollectionIds: string[];
    previousSharedCollectionIds: string[];
}): Promise<LibraryItemsCollectionsUpdateResult> {
    const parsed = LibraryItemsCollectionsUpdateInputSchema.safeParse({
        itemIds: uniqueStrings(input.itemIds),
        nextSharedCollectionIds: uniqueStrings(input.nextSharedCollectionIds),
        previousSharedCollectionIds: uniqueStrings(
            input.previousSharedCollectionIds
        ),
    });

    if (!parsed.success) {
        return {
            message: "Pick valid collections and saved items before saving.",
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage collections."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        const result = await service.updateLibraryItemsCollections({
            itemIds: parsed.data.itemIds,
            nextSharedCollectionIds: parsed.data.nextSharedCollectionIds,
            previousSharedCollectionIds:
                parsed.data.previousSharedCollectionIds,
            userId: auth.userId,
        });

        return {
            ...result,
            status: "UPDATED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't update collections for those items.",
            log,
        });
    }
}

export async function updateLibraryItemCollections(input: {
    collectionIds: string[];
    itemId: string;
}): Promise<LibraryItemCollectionsUpdateResult> {
    const parsed = LibraryItemCollectionsUpdateInputSchema.safeParse({
        collectionIds: uniqueStrings(input.collectionIds),
        itemId: input.itemId,
    });

    if (!parsed.success) {
        return {
            message: "Pick valid collections before saving.",
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage collections."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        const result = await service.updateLibraryItemCollections({
            collectionIds: parsed.data.collectionIds,
            itemId: parsed.data.itemId,
            userId: auth.userId,
        });

        return {
            ...result,
            status: "UPDATED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't update collections for this item.",
            log,
        });
    }
}
