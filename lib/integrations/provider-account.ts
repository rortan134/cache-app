import "server-only";

import { prisma } from "@/prisma";

export async function getIntegrationAccountId(
    userId: string,
    providerId: string
): Promise<string | null> {
    const account = await prisma.account.findFirst({
        select: {
            accountId: true,
        },
        where: {
            providerId,
            userId,
        },
    });

    return account?.accountId ?? null;
}
