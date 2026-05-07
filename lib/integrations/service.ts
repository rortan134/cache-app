import "server-only";

import { prisma } from "@/prisma";
import { listIntegrationAccountProviderIds } from "./support";

const LINKED_INTEGRATION_ACCOUNT_LIMIT = 50;

/**
 * Lists linked OAuth accounts for integrations the app supports.
 *
 * Only returns accounts whose providerId matches a known integration,
 * because the account table may contain auth-only providers (e.g. Google
 * sign-in) that are not treated as content integrations.
 */
export function listLinkedIntegrationAccounts(args: {
    userId: string;
}): Promise<Array<{ providerId: string }>> {
    return prisma.account.findMany({
        select: { providerId: true },
        take: LINKED_INTEGRATION_ACCOUNT_LIMIT,
        where: {
            providerId: {
                in: listIntegrationAccountProviderIds(),
            },
            userId: args.userId,
        },
    });
}
