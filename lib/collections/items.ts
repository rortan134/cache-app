"use server";

import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    handleActionError,
    requireActionUserId,
} from "@/lib/common/procedure";
import type { LibraryCollectionTag } from "@/lib/common/types";
import * as z from "zod";
import { LibraryCollectionError } from "./error";
import * as service from "./service";

const log = createLogger("library:actions:items");

const UpdateLibraryItemCollectionsInputSchema = z.object({
    collectionIds: z.array(z.string().trim().min(1)).max(100),
    itemId: z.string().trim().min(1),
});

const DeleteLibraryItemInputSchema = z.object({
    itemId: z
        .string()
        .trim()
        .min(1, "Select a saved item before trying to delete it."),
});

export type DeleteLibraryItemResult =
    | {
          itemId: string;
          status: "DELETED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
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
    const parsed = DeleteLibraryItemInputSchema.safeParse({ itemId });
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
        const id = await service.deleteLibraryItem({
            itemId: parsed.data.itemId,
            userId: auth.userId,
        });

        return {
            itemId: id,
            status: "DELETED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't delete this saved item right now.",
            log,
        });
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
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't update collections for this item.",
            log,
        });
    }
}
