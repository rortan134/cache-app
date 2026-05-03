import "server-only";

import { ReviewError } from "@/lib/review/error";
import { prisma } from "@/prisma";

export async function markLibraryItemAsReviewed({
    itemId,
    userId,
}: {
    itemId: string;
    userId: string;
}): Promise<void> {
    const result = await prisma.libraryItem.updateMany({
        data: {
            reviewedAt: new Date(),
        },
        where: {
            id: itemId,
            userId,
        },
    });

    if (result.count === 0) {
        throw new ReviewError({
            code: "not_found",
            message: "Saved item not found.",
            operation: "markLibraryItemAsReviewed",
        });
    }
}
