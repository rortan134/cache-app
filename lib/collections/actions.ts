"use server";

import { collectionNameSchema, uniqueStrings } from "@/lib/collections/utils";
import { createLogger } from "@/lib/common/logs/console/logger";
import {
    getValidationErrorMessage,
    handleActionError,
    requireActionUserId,
} from "@/lib/common/procedure";
import type {
    LibraryCollectionSummary,
    LibraryCollectionTag,
} from "@/lib/common/types";
import type { CollectionPriority } from "@/prisma/client/enums";
import * as z from "zod";
import { LibraryCollectionError } from "./error";
import * as service from "./service";

const log = createLogger("library:actions");

const CreateCollectionInputSchema = z.object({
    assignToItemId: z.string().trim().min(1).optional(),
    description: z.string().trim().max(1024).optional(),
    name: collectionNameSchema,
});

const CreateCollectionFromItemsInputSchema = z.object({
    description: z.string().trim().max(1024).optional(),
    itemIds: z.array(z.string().trim().min(1)).min(1).max(500),
    name: collectionNameSchema,
});

const DeleteCollectionInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to delete."),
});

const DuplicateCollectionInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to copy."),
});

const UpdateCollectionPriorityInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to update."),
    priority: z.enum([
        "none",
        "very_relevant",
        "relevant",
        "peripheral",
        "archive",
    ] satisfies [CollectionPriority, ...CollectionPriority[]]),
});

const RenameCollectionInputSchema = z.object({
    collectionId: z.string().trim().min(1, "Select a collection to rename."),
    name: collectionNameSchema,
});

export type CreateCollectionResult =
    | {
          assignedItemId: string | null;
          collection: LibraryCollectionSummary;
          status: "CREATED";
      }
    | {
          message: string;
          status:
              | "DUPLICATE"
              | "ERROR"
              | "INVALID"
              | "NOT_FOUND"
              | "UNAUTHORIZED";
      };

export type CreateCollectionFromItemsResult =
    | {
          assignedItemIds: string[];
          collection: LibraryCollectionSummary;
          status: "CREATED";
      }
    | {
          message: string;
          status:
              | "DUPLICATE"
              | "ERROR"
              | "INVALID"
              | "NOT_FOUND"
              | "UNAUTHORIZED";
      };

export type DeleteCollectionResult =
    | {
          collection: Pick<LibraryCollectionSummary, "id" | "name">;
          status: "DELETED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type DuplicateCollectionResult =
    | {
          assignedItemIds: string[];
          collection: LibraryCollectionSummary;
          status: "CREATED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type UpdateCollectionPriorityResult =
    | {
          collection: LibraryCollectionTag;
          status: "UPDATED";
      }
    | {
          message: string;
          status: "ERROR" | "INVALID" | "NOT_FOUND" | "UNAUTHORIZED";
      };

export type RenameCollectionResult =
    | {
          collection: LibraryCollectionTag;
          status: "UPDATED";
      }
    | {
          message: string;
          status:
              | "DUPLICATE"
              | "ERROR"
              | "INVALID"
              | "NOT_FOUND"
              | "UNAUTHORIZED";
      };

const ERROR_CODE_TO_STATUS = {
    duplicate_name: "DUPLICATE",
    not_found: "NOT_FOUND",
} as const;

export async function deleteCollection(input: {
    collectionId: string;
}): Promise<DeleteCollectionResult> {
    const parsed = DeleteCollectionInputSchema.safeParse(input);
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
    if ("status" in auth) {
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
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't delete this collection right now.",
            log,
        });
    }
}

export async function duplicateCollection(input: {
    collectionId: string;
}): Promise<DuplicateCollectionResult> {
    const parsed = DuplicateCollectionInputSchema.safeParse(input);
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
    if ("status" in auth) {
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
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage:
                "We couldn't make a copy of this collection right now.",
            log,
        });
    }
}

export async function updateCollectionPriority(input: {
    collectionId: string;
    priority: CollectionPriority;
}): Promise<UpdateCollectionPriorityResult> {
    const parsed = UpdateCollectionPriorityInputSchema.safeParse(input);
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
    if ("status" in auth) {
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
            codeToStatus: { not_found: "NOT_FOUND" },
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage:
                "We couldn't update this collection priority right now.",
            log,
        });
    }
}

export async function renameCollection(input: {
    collectionId: string;
    name: string;
}): Promise<RenameCollectionResult> {
    const parsed = RenameCollectionInputSchema.safeParse(input);
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
    if ("status" in auth) {
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
            codeToStatus: ERROR_CODE_TO_STATUS,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't rename this collection right now.",
            log,
        });
    }
}

export async function createCollection(input: {
    assignToItemId?: string;
    description?: string;
    name: string;
}): Promise<CreateCollectionResult> {
    const parsed = CreateCollectionInputSchema.safeParse(input);
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
        "Sign in again to create collections."
    );
    if ("status" in auth) {
        return auth;
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
            codeToStatus: ERROR_CODE_TO_STATUS,
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
}): Promise<CreateCollectionFromItemsResult> {
    const parsed = CreateCollectionFromItemsInputSchema.safeParse({
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
    if ("status" in auth) {
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
            codeToStatus: ERROR_CODE_TO_STATUS,
            error,
            errorFactory: LibraryCollectionError,
            fallbackMessage: "We couldn't create this collection right now.",
            log,
        });
    }
}
