"use server";

import type {
    ActionError,
    LibraryCollectionTag,
} from "@/lib/collections/utils";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    handleActionError,
} from "@/lib/common/procedure";
import { requireActionUserId } from "@/lib/auth/service";
import * as z from "zod";
import { CollectionShareError } from "./error";
import {
    disablePublicCollectionShare,
    enablePublicCollectionShare,
    type SharedLibraryCollectionTag,
} from "./service";
import { buildPublicCollectionShareUrl } from "./url";

const log = createLogger("collection-sharing:actions");

const CollectionShareInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to share."),
});

export type CollectionPublicShareResult =
    | {
          collection: SharedLibraryCollectionTag;
          shareUrl: string;
          status: "SHARED";
      }
    | ActionError;

export type CollectionPublicShareDisableResult =
    | {
          collection: LibraryCollectionTag;
          status: "DISABLED";
      }
    | ActionError;

export async function shareCollectionPublicly(input: {
    collectionId: string;
}): Promise<CollectionPublicShareResult> {
    const parsed = CollectionShareInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Select a collection to share."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to share collections."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        const collection = await enablePublicCollectionShare({
            collectionId: parsed.data.collectionId,
            userId: auth.userId,
        });

        return {
            collection,
            shareUrl: buildPublicCollectionShareUrl(collection.shareId),
            status: "SHARED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: CollectionShareError,
            fallbackMessage: "We couldn't create a public link right now.",
            log,
        });
    }
}

export async function disableCollectionSharing(input: {
    collectionId: string;
}): Promise<CollectionPublicShareDisableResult> {
    const parsed = CollectionShareInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Select a collection to stop sharing."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage shared collections."
    );
    if ("status" in auth) {
        return auth;
    }

    try {
        const collection = await disablePublicCollectionShare({
            collectionId: parsed.data.collectionId,
            userId: auth.userId,
        });

        return {
            collection,
            status: "DISABLED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: CollectionShareError,
            fallbackMessage:
                "We couldn't stop sharing this collection right now.",
            log,
        });
    }
}
