import { ITEM_KIND_NOTE } from "@/lib/common/constants";
import { prisma } from "@/prisma";
import { CommentError } from "./error";
import { normalizeCommentText } from "./utils";

/**
 * Read the single comment attached to an item. Returns null when the item has
 * no comment or the row does not belong to the user.
 */
export async function getCommentForItem({
    libraryItemId,
    userId,
}: {
    libraryItemId: string;
    userId: string;
}): Promise<{ contentText: string } | null> {
    const comment = await prisma.comment.findUnique({
        where: { libraryItemId },
    });

    if (!comment || comment.userId !== userId) {
        return null;
    }

    return { contentText: comment.contentText };
}

/**
 * Create, update, or delete the single comment on an item. Empty (or
 * whitespace-only) drafts delete the row so "no comment" has one legal state.
 * Notes cannot carry comments.
 */
export async function saveCommentForItem({
    contentText,
    libraryItemId,
    userId,
}: {
    contentText: string;
    libraryItemId: string;
    userId: string;
}): Promise<void> {
    const normalized = normalizeCommentText(contentText);

    await prisma.$transaction(async (tx) => {
        const item = await tx.libraryItem.findFirst({
            select: { kind: true },
            where: { deletedAt: null, id: libraryItemId, userId },
        });

        if (!item) {
            throw new CommentError({
                code: "not_found",
                message: "We couldn't find that saved item.",
                operation: "saveCommentForItem",
            });
        }

        if (item.kind === ITEM_KIND_NOTE) {
            throw new CommentError({
                code: "invalid_kind",
                message: "Comments are not available for notes.",
                operation: "saveCommentForItem",
            });
        }

        if (normalized === null) {
            await tx.comment.deleteMany({
                where: { libraryItemId, userId },
            });
            return;
        }

        await tx.comment.upsert({
            create: {
                contentText: normalized,
                libraryItemId,
                userId,
            },
            update: { contentText: normalized },
            where: { libraryItemId },
        });
    });
}
