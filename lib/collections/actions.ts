"use server";

import { getSessionUserId } from "@/lib/auth/server";
import { collectionNameSchema } from "@/lib/collections/utils";
import { extractNamedErrorMessage } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
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

function handleError(error: unknown, fallbackMessage: string) {
    const named = extractNamedErrorMessage(error);
    if (LibraryCollectionError.isInstance(error)) {
        const status =
            ERROR_CODE_TO_STATUS[
                error.data.code as keyof typeof ERROR_CODE_TO_STATUS
            ];
        if (status) {
            return { message: named.message, status };
        }
    }

    log.error(fallbackMessage, error);
    return {
        message: fallbackMessage,
        status: "ERROR" as const,
    };
}

function handleNotFoundError(error: unknown, fallbackMessage: string) {
    const named = extractNamedErrorMessage(error);
    if (
        LibraryCollectionError.isInstance(error) &&
        error.data.code === "not_found"
    ) {
        return {
            message: named.message,
            status: "NOT_FOUND" as const,
        };
    }

    log.error(fallbackMessage, error);
    return {
        message: fallbackMessage,
        status: "ERROR" as const,
    };
}

export async function deleteCollection(input: {
    collectionId: string;
}): Promise<DeleteCollectionResult> {
    const parsed = DeleteCollectionInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Select a collection to delete.",
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
        const collection = await service.deleteCollection({
            collectionId: parsed.data.collectionId,
            userId,
        });

        return {
            collection,
            status: "DELETED",
        };
    } catch (error) {
        return handleNotFoundError(
            error,
            "We couldn't delete this collection right now."
        );
    }
}

export async function duplicateCollection(input: {
    collectionId: string;
}): Promise<DuplicateCollectionResult> {
    const parsed = DuplicateCollectionInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Select a collection to copy.",
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
        const result = await service.duplicateCollection({
            collectionId: parsed.data.collectionId,
            userId,
        });

        return {
            ...result,
            status: "CREATED",
        };
    } catch (error) {
        return handleNotFoundError(
            error,
            "We couldn't make a copy of this collection right now."
        );
    }
}

export async function updateCollectionPriority(input: {
    collectionId: string;
    priority: CollectionPriority;
}): Promise<UpdateCollectionPriorityResult> {
    const parsed = UpdateCollectionPriorityInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Pick a valid priority before saving.",
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
        const collection = await service.updateCollectionPriority({
            collectionId: parsed.data.collectionId,
            priority: parsed.data.priority,
            userId,
        });

        return {
            collection,
            status: "UPDATED",
        };
    } catch (error) {
        return handleNotFoundError(
            error,
            "We couldn't update this collection priority right now."
        );
    }
}

export async function renameCollection(input: {
    collectionId: string;
    name: string;
}): Promise<RenameCollectionResult> {
    const parsed = RenameCollectionInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Enter a valid collection name.",
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
        const collection = await service.renameCollection({
            collectionId: parsed.data.collectionId,
            name: parsed.data.name,
            userId,
        });

        return {
            collection,
            status: "UPDATED",
        };
    } catch (error) {
        return handleError(
            error,
            "We couldn't rename this collection right now."
        );
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
            message:
                parsed.error.issues[0]?.message ??
                "Enter a valid collection name.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to create collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const result = await service.createCollection({
            assignToItemId: parsed.data.assignToItemId,
            description: parsed.data.description,
            name: parsed.data.name,
            userId,
        });

        return {
            ...result,
            status: "CREATED",
        };
    } catch (error) {
        return handleError(
            error,
            "We couldn't create this collection right now."
        );
    }
}

export async function createCollectionFromItems(input: {
    description?: string;
    itemIds: string[];
    name: string;
}): Promise<CreateCollectionFromItemsResult> {
    const parsed = CreateCollectionFromItemsInputSchema.safeParse({
        ...input,
        itemIds: Array.from(new Set(input.itemIds)),
    });

    if (!parsed.success) {
        return {
            message:
                parsed.error.issues[0]?.message ??
                "Enter a valid collection name and at least one saved item.",
            status: "INVALID",
        };
    }

    const userId = await getSessionUserId();
    if (!userId) {
        return {
            message: "Sign in again to create collections.",
            status: "UNAUTHORIZED",
        };
    }

    try {
        const result = await service.createCollectionFromItems({
            description: parsed.data.description,
            itemIds: parsed.data.itemIds,
            name: parsed.data.name,
            userId,
        });

        return {
            ...result,
            status: "CREATED",
        };
    } catch (error) {
        return handleError(
            error,
            "We couldn't create this collection right now."
        );
    }
}
