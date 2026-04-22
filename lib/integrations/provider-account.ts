import "server-only";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/prisma";
import { headers } from "next/headers";

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

export async function resolveProviderAccessToken(args: {
    accountId?: string;
    providerId: string;
}): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId: args.accountId,
            providerId: args.providerId,
        },
        headers: await headers(),
    });

    return tokenResponse?.accessToken ?? null;
}
