import "server-only";

import { auth } from "@/lib/auth/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import { prisma } from "@/prisma";
import { headers } from "next/headers";
import { listIntegrationAccountProviderIds } from "./support";

const log = createLogger("integrations:account");

const LINKED_INTEGRATION_ACCOUNT_LIMIT = 50;
const OAUTH_SCOPE_SEPARATOR_PATTERN = /[\s,]+/;

const SOFT_TOKEN_RESOLUTION_ERROR_CODES = new Set([
    "ACCOUNT_NOT_FOUND",
    "FAILED_TO_GET_ACCESS_TOKEN",
]);

export interface ResolvedProviderAccess {
    accessToken: string;
    accountId: string;
}

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

async function tryGetAccessToken(
    accountId: string | undefined,
    providerId: string
): Promise<string | null> {
    const tokenResponse = await auth.api.getAccessToken({
        body: {
            accountId,
            providerId,
        },
        headers: await headers(),
    });

    return tokenResponse?.accessToken ?? null;
}

function getApiErrorCode(error: unknown): string | null {
    if (
        typeof error !== "object" ||
        error === null ||
        !("body" in error) ||
        typeof error.body !== "object" ||
        error.body === null ||
        !("code" in error.body) ||
        typeof error.body.code !== "string"
    ) {
        return null;
    }
    return error.body.code;
}

function isSoftTokenResolutionFailure(error: unknown): boolean {
    const code = getApiErrorCode(error);
    return code !== null && SOFT_TOKEN_RESOLUTION_ERROR_CODES.has(code);
}

function accountHasScope(
    scope: string | null | undefined,
    requiredScope: string
): boolean {
    if (!scope) {
        return false;
    }
    return scope.split(OAUTH_SCOPE_SEPARATOR_PATTERN).includes(requiredScope);
}

function compareAccountsForScopePreference(
    left: { accountId: string; scope: string | null },
    right: { accountId: string; scope: string | null },
    requiredScope: string | undefined
): number {
    if (requiredScope) {
        const leftHasScope = accountHasScope(left.scope, requiredScope);
        const rightHasScope = accountHasScope(right.scope, requiredScope);
        if (leftHasScope !== rightHasScope) {
            return leftHasScope ? -1 : 1;
        }
    }
    return left.accountId.localeCompare(right.accountId);
}

/**
 * Resolves a valid access token for an OAuth provider account.
 *
 * When a specific {@link args.accountId} is given, only that account is
 * attempted. When {@link args.userId} is given without an accountId, ALL
 * accounts matching the provider are tried — essential when a user has
 * linked multiple Google accounts via accountLinking, so an arbitrary row
 * isn't picked while another holds a valid token.
 *
 * When {@link args.requiredScope} is set, accounts whose stored scope grants
 * it are tried first. Soft per-account token failures continue to the next
 * account; session/config failures rethrow.
 */
export async function resolveProviderAccountAccess(args: {
    accountId?: string;
    providerId: string;
    requiredScope?: string;
    userId?: string;
}): Promise<ResolvedProviderAccess | null> {
    if (args.accountId) {
        if (args.userId) {
            const ownedAccount = await prisma.account.findFirst({
                select: { accountId: true },
                where: {
                    accountId: args.accountId,
                    providerId: args.providerId,
                    userId: args.userId,
                },
            });
            if (!ownedAccount) {
                log.debug("Pinned account is not owned by user", {
                    accountId: args.accountId,
                    providerId: args.providerId,
                    userId: args.userId,
                });
                return null;
            }
        }

        try {
            const accessToken = await tryGetAccessToken(
                args.accountId,
                args.providerId
            );
            if (!accessToken) {
                return null;
            }
            return { accessToken, accountId: args.accountId };
        } catch (error) {
            if (isSoftTokenResolutionFailure(error)) {
                log.debug("Pinned account access token is unusable", {
                    accountId: args.accountId,
                    code: getApiErrorCode(error),
                    providerId: args.providerId,
                });
                return null;
            }
            throw error;
        }
    }

    if (args.userId) {
        for await (const access of eachProviderAccountAccess({
            providerId: args.providerId,
            requiredScope: args.requiredScope,
            userId: args.userId,
        })) {
            return access;
        }

        log.warn("No valid access token found across all accounts", {
            providerId: args.providerId,
            requiredScope: args.requiredScope,
            userId: args.userId,
        });
        return null;
    }

    return null;
}

/**
 * Yields successfully resolved access tokens for each linked account,
 * preferring accounts that grant {@link args.requiredScope}. Soft token
 * failures skip to the next account; hard auth/config errors rethrow.
 */
export async function* eachProviderAccountAccess(args: {
    providerId: string;
    requiredScope?: string;
    userId: string;
}): AsyncGenerator<ResolvedProviderAccess> {
    const accounts = await prisma.account.findMany({
        orderBy: { accountId: "asc" },
        select: { accountId: true, scope: true },
        take: LINKED_INTEGRATION_ACCOUNT_LIMIT,
        where: {
            providerId: args.providerId,
            userId: args.userId,
        },
    });

    const orderedAccounts = args.requiredScope
        ? accounts.toSorted((left, right) =>
              compareAccountsForScopePreference(left, right, args.requiredScope)
          )
        : accounts;

    for (const account of orderedAccounts) {
        try {
            const accessToken = await tryGetAccessToken(
                account.accountId,
                args.providerId
            );
            if (accessToken) {
                yield { accessToken, accountId: account.accountId };
            }
        } catch (error) {
            if (isSoftTokenResolutionFailure(error)) {
                log.debug("Skipping account with unusable access token", {
                    accountId: account.accountId,
                    code: getApiErrorCode(error),
                    providerId: args.providerId,
                });
                continue;
            }
            throw error;
        }
    }
}

export async function resolveProviderAccountAccessToken(args: {
    accountId?: string;
    providerId: string;
    requiredScope?: string;
    userId?: string;
}): Promise<string | null> {
    if (!(args.accountId || args.userId)) {
        return tryGetAccessToken(undefined, args.providerId);
    }
    const resolved = await resolveProviderAccountAccess(args);
    return resolved?.accessToken ?? null;
}
