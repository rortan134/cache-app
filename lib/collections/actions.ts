"use server";

import { isUnauthenticated, requireActionUserId } from "@/lib/auth/session";
import {
    STATUS_MAP_NOT_FOUND,
    collectionNameSchema,
    uniqueStrings,
    type ActionError,
    type ActionErrorWithDuplicate,
    type ActionErrorWithoutNotFound,
    type LibraryCollectionSummary,
    type LibraryCollectionTag,
} from "@/lib/collections/utils";
import {
    getValidationErrorMessage,
    handleActionError,
} from "@/lib/common/action";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import type { CollectionPriority } from "@/prisma/client/enums";
import * as z from "zod";
import { LibraryCollectionError } from "./error";
import * as service from "./service";

const log = createLogger("library:actions");

const STATUS_MAP_DUPLICATE_OR_NOT_FOUND = {
    duplicate_name: "DUPLICATE",
    not_found: "NOT_FOUND",
} as const;

const CollectionCreateInputSchema = z.object({
    assignToItemId: z.string().trim().min(1).optional(),
    description: z.string().trim().max(DESCRIPTION_MAX_LENGTH).optional(),
    name: collectionNameSchema,
});

const CollectionCreateFromItemsInputSchema = z.object({
    description: z.string().trim().max(DESCRIPTION_MAX_LENGTH).optional(),
    itemIds: z.array(z.string().trim().min(1)).min(1).max(500),
    name: collectionNameSchema,
});

const CollectionDeleteInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to delete."),
});

const CollectionDuplicateInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to copy."),
});

const CollectionPriorityUpdateInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to update."),
    priority: z.enum([
        "none",
        "very_relevant",
        "relevant",
        "peripheral",
        "archive",
    ] satisfies [CollectionPriority, ...CollectionPriority[]]),
});

const CollectionRenameInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to rename."),
    name: collectionNameSchema,
});

export type CollectionCreateResult =
    | {
          assignedItemId: string | null;
          collection: LibraryCollectionSummary;
          status: "CREATED";
      }
    | ActionErrorWithDuplicate;

export type CollectionCreateFromItemsResult =
    | {
          assignedItemIds: string[];
          collection: LibraryCollectionSummary;
          status: "CREATED";
      }
    | ActionErrorWithDuplicate;

export type CollectionDeleteResult =
    | {
          collection: Pick<LibraryCollectionSummary, "id" | "name">;
          status: "DELETED";
      }
    | ActionError;

export type CollectionDuplicateResult =
    | {
          assignedItemIds: string[];
          collection: LibraryCollectionSummary;
          status: "CREATED";
      }
    | ActionError;

export type CollectionPriorityUpdateResult =
    | {
          collection: LibraryCollectionTag;
          status: "UPDATED";
      }
    | ActionError;

export type CollectionRenameResult =
    | {
          collection: LibraryCollectionTag;
          status: "UPDATED";
      }
    | ActionErrorWithDuplicate;

export async function createCollection(input: {
    assignToItemId?: string;
    description?: string;
    name: string;
}): Promise<CollectionCreateResult> {
    const auth = await requireActionUserId(
        "Sign in again to create collections."
    );
    if (isUnauthenticated(auth)) {
        return auth;
    }

    const parsed = CollectionCreateInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Enter a valid collection name."
            ),
            status: "INVALID",
        };
    }

    try {
        const result = await service.createCollection({
            assignToItemId: parsed.data.assignToItemId,
            description: parsed.data.description,
            name: parsed.data.name,
            userId: auth.userId,
        });

        return {
            ...result,
            status: "CREATED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_DUPLICATE_OR_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't create this collection right now.",
            log,
        });
    }
}

export async function createCollectionFromItems(input: {
    description?: string;
    itemIds: string[];
    name: string;
}): Promise<CollectionCreateFromItemsResult> {
    const parsed = CollectionCreateFromItemsInputSchema.safeParse({
        ...input,
        itemIds: uniqueStrings(input.itemIds),
    });

    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Enter a valid collection name and at least one saved item."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to create collections."
    );
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        const result = await service.createCollectionFromItems({
            description: parsed.data.description,
            itemIds: parsed.data.itemIds,
            name: parsed.data.name,
            userId: auth.userId,
        });

        return {
            ...result,
            status: "CREATED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_DUPLICATE_OR_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't create this collection right now.",
            log,
        });
    }
}

export async function deleteCollection(input: {
    collectionId: string;
}): Promise<CollectionDeleteResult> {
    const parsed = CollectionDeleteInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Select a collection to delete."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage collections."
    );
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        const collection = await service.deleteCollection({
            collectionId: parsed.data.collectionId,
            userId: auth.userId,
        });

        return {
            collection,
            status: "DELETED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't delete this collection right now.",
            log,
        });
    }
}

export async function duplicateCollection(input: {
    collectionId: string;
}): Promise<CollectionDuplicateResult> {
    const parsed = CollectionDuplicateInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Select a collection to copy."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage collections."
    );
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        const result = await service.duplicateCollection({
            collectionId: parsed.data.collectionId,
            userId: auth.userId,
        });

        return {
            ...result,
            status: "CREATED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage:
                "We couldn't make a copy of this collection right now.",
            log,
        });
    }
}

export async function renameCollection(input: {
    collectionId: string;
    name: string;
}): Promise<CollectionRenameResult> {
    const parsed = CollectionRenameInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Enter a valid collection name."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage collections."
    );
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        const collection = await service.renameCollection({
            collectionId: parsed.data.collectionId,
            name: parsed.data.name,
            userId: auth.userId,
        });

        return {
            collection,
            status: "UPDATED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_DUPLICATE_OR_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't rename this collection right now.",
            log,
        });
    }
}

export async function updateCollectionPriority(input: {
    collectionId: string;
    priority: CollectionPriority;
}): Promise<CollectionPriorityUpdateResult> {
    const parsed = CollectionPriorityUpdateInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "Pick a valid priority before saving."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId(
        "Sign in again to manage collections."
    );
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        const collection = await service.updateCollectionPriority({
            collectionId: parsed.data.collectionId,
            priority: parsed.data.priority,
            userId: auth.userId,
        });

        return {
            collection,
            status: "UPDATED",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: STATUS_MAP_NOT_FOUND,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage:
                "We couldn't update this collection priority right now.",
            log,
        });
    }
}

export async function disableSmartCollections(): Promise<
    | { status: "DISABLED" }
    | { message: string; status: "ERROR" | "UNAUTHORIZED" }
> {
    const auth = await requireActionUserId(
        "Sign in again to manage smart collections."
    );
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        await service.disableSmartCollectionsForUser(auth.userId);

        return { status: "DISABLED" };
    } catch (error) {
        return handleActionError({
            codeToStatus: {},
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't disable smart collections right now.",
            log,
        });
    }
}

const MediaDownloadInputSchema = z.object({
    url: z.string().trim().min(1, "A valid URL is required to download media."),
});

export type MediaDownloadResult =
    | {
          downloadUrl: string;
          status: "SUCCESS";
      }
    | ActionErrorWithoutNotFound;

export async function downloadMedia(url: string): Promise<MediaDownloadResult> {
    const parsed = MediaDownloadInputSchema.safeParse({ url });
    if (!parsed.success) {
        return {
            message: getValidationErrorMessage(
                parsed,
                "A valid URL is required to download media."
            ),
            status: "INVALID",
        };
    }

    const auth = await requireActionUserId("Sign in again to download media.");
    if (isUnauthenticated(auth)) {
        return auth;
    }

    try {
        const downloadUrl = await service.downloadMedia(parsed.data.url);
        return {
            downloadUrl,
            status: "SUCCESS",
        };
    } catch (error) {
        return handleActionError({
            codeToStatus: {},
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage:
                "We hit an unexpected error while preparing your download.",
            log,
        });
    }
}
