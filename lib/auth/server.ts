import { SessionError } from "@/lib/auth/error";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/billing/client";
import { APP_NAME, BASE_URL } from "@/lib/common/constants";
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

const log = createLogger("Auth:server");

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

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

function getOAuthCredentials(
    envPrefix: string
): { clientId: string; clientSecret: string } | null {
    const clientId = optionalEnv(`${envPrefix}_CLIENT_ID`);
    const clientSecret = optionalEnv(`${envPrefix}_CLIENT_SECRET`);
    return clientId && clientSecret ? { clientId, clientSecret } : null;
}

// ---------------------------------------------------------------------------
// OAuth user profile abstraction
// ---------------------------------------------------------------------------

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
    mapUser: (data: T) => OAuthUserProfile | null,
    extraHeaders: Record<string, string> = {}
): Promise<OAuthUserProfile | null> {
    if (!tokens.accessToken) {
        return null;
    }

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            ...extraHeaders,
        },
    });
    if (!response.ok) {
        return null;
    }

    return mapUser((await response.json()) as T);
}

// ---------------------------------------------------------------------------
// Pinterest OAuth
// ---------------------------------------------------------------------------

interface PinterestUserAccount {
    id?: string;
    profile_image?: string;
    username?: string;
}

function mapPinterestUser(data: PinterestUserAccount): OAuthUserProfile | null {
    const id = data.id ?? data.username;
    if (!id) {
        return null;
    }
    const idString = String(id);
    return {
        email: `pinterest.${idString}.integration@placeholder.cache`,
        emailVerified: false,
        id: idString,
        image: data.profile_image,
        name: data.username ?? idString,
    };
}

function buildPinterestOAuthConfig(): GenericOAuthConfig | null {
    const creds = getOAuthCredentials("PINTEREST");
    if (!creds) {
        return null;
    }

    return {
        authentication: "basic",
        authorizationUrl: "https://www.pinterest.com/oauth/",
        ...creds,
        disableSignUp: true,
        getUserInfo: (tokens) =>
            fetchOAuthUser(
                tokens,
                "https://api.pinterest.com/v5/user_account",
                mapPinterestUser
            ),
        pkce: true,
        providerId: "pinterest",
        scopes: ["user_accounts:read", "boards:read", "pins:read"],
        tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    };
}

// ---------------------------------------------------------------------------
// X (Twitter) OAuth
// ---------------------------------------------------------------------------

interface XUserAccount {
    data?: {
        id?: string;
        name?: string;
        profile_image_url?: string;
        username?: string;
    };
}

function mapXUser(data: XUserAccount): OAuthUserProfile | null {
    const id = data.data?.id;
    if (!id) {
        return null;
    }
    return {
        email: `x.${id}.integration@placeholder.cache`,
        emailVerified: false,
        id,
        image: data.data?.profile_image_url,
        name: data.data?.name ?? data.data?.username ?? id,
    };
}

function buildXOAuthConfig(): GenericOAuthConfig | null {
    const creds = getOAuthCredentials("X");
    if (!creds) {
        return null;
    }

    return {
        authentication: "basic",
        authorizationUrl: "https://x.com/i/oauth2/authorize",
        ...creds,
        disableSignUp: true,
        getUserInfo: (tokens) =>
            fetchOAuthUser(
                tokens,
                "https://api.x.com/2/users/me?user.fields=profile_image_url",
                mapXUser,
                { Accept: "application/json" }
            ),
        pkce: true,
        providerId: "x",
        scopes: ["bookmark.read", "offline.access", "tweet.read", "users.read"],
        tokenUrl: "https://api.x.com/2/oauth2/token",
    };
}

// ---------------------------------------------------------------------------
// GitHub OAuth
// ---------------------------------------------------------------------------

interface GitHubUserAccount {
    avatar_url?: string;
    id?: number;
    login?: string;
    name?: string;
}

function mapGitHubUser(data: GitHubUserAccount): OAuthUserProfile | null {
    const id = typeof data.id === "number" ? String(data.id) : undefined;
    if (!id) {
        return null;
    }
    return {
        email: `github.${id}.integration@placeholder.cache`,
        emailVerified: false,
        id,
        image: data.avatar_url,
        name: data.name ?? data.login ?? id,
    };
}

function buildGitHubOAuthConfig(): GenericOAuthConfig | null {
    const creds = getOAuthCredentials("GITHUB");
    if (!creds) {
        return null;
    }

    return {
        authentication: "basic",
        authorizationUrl: "https://github.com/login/oauth/authorize",
        ...creds,
        disableSignUp: true,
        getUserInfo: (tokens) =>
            fetchOAuthUser(
                tokens,
                "https://api.github.com/user",
                mapGitHubUser,
                {
                    Accept: "application/vnd.github+json",
                    "User-Agent": APP_NAME,
                }
            ),
        providerId: "github",
        scopes: ["read:user"],
        tokenUrl: "https://github.com/login/oauth/access_token",
    };
}

// ---------------------------------------------------------------------------
// Auth configuration
// ---------------------------------------------------------------------------

const baseURL = process.env.BETTER_AUTH_URL ?? BASE_URL;

const trustedOrigins = [
    baseURL,
    ...(process.env.TRUSTED_ORIGINS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? []),
];

const genericOAuthConfig = [
    buildPinterestOAuthConfig(),
    buildXOAuthConfig(),
    buildGitHubOAuthConfig(),
].filter((c): c is GenericOAuthConfig => c !== null);

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
            // NOTE: The @better-auth/stripe plugin registers its webhook handler
            // implicitly at /api/auth/stripe/webhook via the catch-all [...all]
            // route in app/api/auth/[...all]/route.ts. Configure the Stripe
            // Dashboard endpoint to exactly: {baseURL}/api/auth/stripe/webhook
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

// ---------------------------------------------------------------------------
// Session utilities
// ---------------------------------------------------------------------------

export async function getServerSession() {
    return auth.api.getSession({
        headers: await headers(),
    });
}

export type Session = Awaited<ReturnType<typeof getServerSession>>;

export async function getSessionUserId(): Promise<string | null> {
    const session = await getServerSession();
    return session?.user?.id ?? null;
}

type WithSessionCallback<T> = (session: Session) => Promise<T> | T;

/**
 * Executes a callback with the current session, normalizing errors to SessionError.
 */
export async function withSession<T>(
    callback: WithSessionCallback<T>
): Promise<T> {
    try {
        const session = await getServerSession();
        return await callback(session);
    } catch (error) {
        log.error("Session operation failed:", error);

        if (error instanceof SessionError) {
            throw error;
        }

        throw new SessionError({
            cause: error instanceof Error ? error : undefined,
            message: error instanceof Error ? error.message : String(error),
            operation: "auth::withSession",
        });
    }
}
