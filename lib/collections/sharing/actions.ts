"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { extractNamedErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import type { LibraryCollectionTag } from "@/lib/common/types";
import * as z from "zod";
import { CollectionShareError } from "./error";
import {
    disablePublicCollectionShare,
    enablePublicCollectionShare,
} from "./service";
import { buildPublicCollectionShareUrl } from "./url";

const log = createLogger("collection-sharing:actions");

const CollectionShareInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to share."),
});

type SharedLibraryCollection = LibraryCollectionTag & {
    readonly shareId: string;
    readonly sharedAt: Date;
};

export type ShareCollectionPubliclyResult =
    | {
          collection: SharedLibraryCollection;
          shareUrl: string;
          status: "SHARED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type DisableCollectionPublicShareResult =
    | {
          collection: LibraryCollectionTag;
          status: "DISABLED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export async function shareCollectionPublicly(input: {
    collectionId: string;
}): Promise<ShareCollectionPubliclyResult> {
    const parsed = CollectionShareInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Select a collection to share.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to share collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const collection = await enablePublicCollectionShare({
            collectionId: parsed.data.collectionId,
            userId,
        });

        if (!(collection.shareId && collection.sharedAt)) {
            throw new Error(
                "Expected a share link after enabling collection sharing."
            );
        }

        return {
            collection: {
                ...collection,
                sharedAt: collection.sharedAt,
                shareId: collection.shareId,
            },
            shareUrl: buildPublicCollectionShareUrl(collection.shareId),
            status: "SHARED",
        };
    } catch (error) {
        const details = extractNamedErrorMessage(error);
        if (
            CollectionShareError.isInstance(error) &&
            error.data.code === "not_found"
        ) {
            return {
                message: details.message,
                status: "NOT_FOUND",
            };
        }

        log.error("Unexpected collection sharing failure", error);
        return {
            message: "We couldn't create a public link right now.",
            status: "ERROR",
        };
    }
}

export async function disableCollectionSharing(input: {
    collectionId: string;
}): Promise<DisableCollectionPublicShareResult> {
    const parsed = CollectionShareInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Select a collection to stop sharing.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to manage shared collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const collection = await disablePublicCollectionShare({
            collectionId: parsed.data.collectionId,
            userId,
        });

        return {
            collection,
            status: "DISABLED",
        };
    } catch (error) {
        const details = extractNamedErrorMessage(error);
        if (
            CollectionShareError.isInstance(error) &&
            error.data.code === "not_found"
        ) {
            return {
                message: details.message,
                status: "NOT_FOUND",
            };
        }

        log.error("Unexpected collection unshare failure", error);
        return {
            message: "We couldn't stop sharing this collection right now.",
            status: "ERROR",
        };
    }
}
