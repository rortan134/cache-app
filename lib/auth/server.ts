import { SessionError } from "@/lib/auth/error";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/billing/client";
import { APP_NAME } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { prisma } from "@/prisma";
import type { OAuth2Tokens } from "@better-auth/core/oauth2";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import type { GenericOAuthConfig } from "better-auth/plugins";
import { genericOAuth, oneTap } from "better-auth/plugins";
import { headers } from "next/headers";

const logger = createLogger("Auth:server");

interface OAuthUserProfile {
    email?: string | null;
    emailVerified: boolean;
    id: string;
    image?: string;
    name?: string;
}

/**
 * Generic OAuth user fetcher that handles the shared pattern:
 * extract token → fetch provider API → guard response → map to profile.
 */
async function fetchOAuthUser<T>(
    tokens: OAuth2Tokens,
    url: string,
    extraHeaders: Record<string, string>,
    mapUser: (data: T) => OAuthUserProfile | null
): Promise<OAuthUserProfile | null> {
    const { accessToken } = tokens;
    if (!accessToken) {
        return null;
    }

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, ...extraHeaders },
    });
    if (!response.ok) {
        return null;
    }

    return mapUser((await response.json()) as T);
}

interface PinterestUserAccount {
    id?: string;
    profile_image?: string;
    username?: string;
}

interface XUserAccount {
    data?: {
        id?: string;
        name?: string;
        profile_image_url?: string;
        username?: string;
    };
}

interface GitHubUserAccount {
    avatar_url?: string;
    id?: number;
    login?: string;
    name?: string;
}

function mapPinterestUser(data: PinterestUserAccount): OAuthUserProfile | null {
    const id = data.id ?? data.username;
    if (!id) {
        return null;
    }
    const sid = String(id);
    return {
        email: `pinterest.${sid}.integration@placeholder.cache`,
        emailVerified: false,
        id: sid,
        image: data.profile_image,
        name: data.username ?? sid,
    };
}

function mapXUser(payload: XUserAccount): OAuthUserProfile | null {
    const id = payload.data?.id;
    if (!id) {
        return null;
    }
    return {
        email: `x.${id}.integration@placeholder.cache`,
        emailVerified: false,
        id,
        image: payload.data?.profile_image_url,
        name: payload.data?.name ?? payload.data?.username ?? id,
    };
}

function mapGitHubUser(payload: GitHubUserAccount): OAuthUserProfile | null {
    const id = typeof payload.id === "number" ? String(payload.id) : undefined;
    if (!id) {
        return null;
    }
    return {
        email: `github.${id}.integration@placeholder.cache`,
        emailVerified: false,
        id,
        image: payload.avatar_url,
        name: payload.name ?? payload.login ?? id,
    };
}

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (value === undefined || value === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function optionalEnv(name: string): string | null {
    const value = process.env[name];
    return value === undefined || value === "" ? null : value;
}

const baseURL =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

const trustedOrigins = [
    baseURL,
    ...(process.env.TRUSTED_ORIGINS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? []),
];

const pinterestClientId = optionalEnv("PINTEREST_CLIENT_ID");
const pinterestClientSecret = optionalEnv("PINTEREST_CLIENT_SECRET");
const xClientId = optionalEnv("X_CLIENT_ID");
const xClientSecret = optionalEnv("X_CLIENT_SECRET");
const githubClientId = optionalEnv("GITHUB_CLIENT_ID");
const githubClientSecret = optionalEnv("GITHUB_CLIENT_SECRET");

const genericOAuthConfig: GenericOAuthConfig[] = [];

if (pinterestClientId && pinterestClientSecret) {
    genericOAuthConfig.push({
        authentication: "basic",
        authorizationUrl: "https://www.pinterest.com/oauth/",
        clientId: pinterestClientId,
        clientSecret: pinterestClientSecret,
        disableSignUp: true,
        getUserInfo: (tokens) =>
            fetchOAuthUser(
                tokens,
                "https://api.pinterest.com/v5/user_account",
                {},
                mapPinterestUser
            ),
        pkce: true,
        providerId: "pinterest",
        scopes: ["user_accounts:read", "boards:read", "pins:read"],
        tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    });
}

if (xClientId && xClientSecret) {
    genericOAuthConfig.push({
        authentication: "basic",
        authorizationUrl: "https://x.com/i/oauth2/authorize",
        clientId: xClientId,
        clientSecret: xClientSecret,
        disableSignUp: true,
        getUserInfo: (tokens) =>
            fetchOAuthUser(
                tokens,
                "https://api.x.com/2/users/me?user.fields=profile_image_url",
                { Accept: "application/json" },
                mapXUser
            ),
        pkce: true,
        providerId: "x",
        scopes: ["bookmark.read", "offline.access", "tweet.read", "users.read"],
        tokenUrl: "https://api.x.com/2/oauth2/token",
    });
}

if (githubClientId && githubClientSecret) {
    genericOAuthConfig.push({
        authentication: "basic",
        authorizationUrl: "https://github.com/login/oauth/authorize",
        clientId: githubClientId,
        clientSecret: githubClientSecret,
        disableSignUp: true,
        getUserInfo: (tokens) =>
            fetchOAuthUser(
                tokens,
                "https://api.github.com/user",
                {
                    Accept: "application/vnd.github+json",
                    "User-Agent": APP_NAME,
                },
                mapGitHubUser
            ),
        providerId: "github",
        scopes: ["read:user"],
        tokenUrl: "https://github.com/login/oauth/access_token",
    });
}

const trustedProviders = [
    "google",
    ...genericOAuthConfig.map((c) => c.providerId),
];

export const auth = betterAuth({
    account: {
        accountLinking: {
            allowDifferentEmails: true,
            enabled: true,
            trustedProviders,
        },
    },
    appName: APP_NAME,
    baseURL,
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: false,
    },
    plugins: [
        nextCookies(),
        oneTap({ clientId: requiredEnv("GOOGLE_CLIENT_ID") }),
        genericOAuth({ config: genericOAuthConfig }),
        stripe({
            createCustomerOnSignUp: true,
            stripeClient: getStripeClient(),
            stripeWebhookSecret: getStripeWebhookSecret(),
            subscription: {
                enabled: true,
                plans: [
                    {
                        annualDiscountPriceId: requiredEnv(
                            "STRIPE_PRICE_ID_YEARLY"
                        ),
                        name: "pro",
                        priceId: requiredEnv("STRIPE_PRICE_ID_MONTHLY"),
                    },
                ],
            },
        }),
    ],
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // Cache duration in seconds
        },
    },
    socialProviders: {
        google: {
            accessType: "offline",
            clientId: requiredEnv("GOOGLE_CLIENT_ID"),
            clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
            prompt: "select_account consent",
            scope: [
                "openid",
                "email",
                "profile",
                "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
            ],
        },
    },
    trustedOrigins,
});

export async function getServerSession() {
    return await auth.api.getSession({
        headers: await headers(),
    });
}

export async function getSessionUserId(): Promise<string | null> {
    const session = await getServerSession();
    return session?.user?.id ?? null;
}

export type Session = ReturnType<typeof getServerSession>;

type WithSessionCallback<T> = (client: Session) => Promise<T> | T;

/**
 * Executes a callback with the Session client, normalizing errors to SessionError.
 */
export const withSession = async <T>(
    callbackFn: WithSessionCallback<T>
): Promise<T> => {
    try {
        const session = getServerSession();
        return await callbackFn(session);
    } catch (error) {
        logger.error("Stripe operation failed:", error);

        if (error instanceof SessionError) {
            throw error;
        }

        throw new SessionError({
            cause: error,
            message: error instanceof Error ? error.message : String(error),
            operation: "core::withStripe",
        });
    }
};
