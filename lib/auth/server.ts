import { getStripeClient, getStripeWebhookSecret } from "@/lib/billing/client";
import { getPlanPriceIds } from "@/lib/billing/prices";
import { APP_NAME, BASE_URL } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { NOTION_API_VERSION } from "@/lib/integrations/notion/api";
import { seedBuiltInAutomationsForUser } from "@/lib/intelligence/automations/service";
import { prisma } from "@/prisma";
import type { OAuth2Tokens } from "@better-auth/core/oauth2";
import { stripe } from "@better-auth/stripe";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import type { GenericOAuthConfig } from "better-auth/plugins";
import { genericOAuth, multiSession, oneTap } from "better-auth/plugins";
import * as z from "zod";
import { i18nPlugin } from "./i18n";

const BASE_AUTH_URL = process.env.BETTER_AUTH_URL ?? BASE_URL;

const EXTENSION_ORIGIN = process.env.CACHE_EXTENSION_ID
    ? `chrome-extension://${process.env.CACHE_EXTENSION_ID}`
    : null;

const ENV_TRUSTED_ORIGINS =
    process.env.TRUSTED_ORIGINS?.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean) ?? [];

const TRUSTED_ORIGINS = [
    BASE_AUTH_URL,
    ...(EXTENSION_ORIGIN ? [EXTENSION_ORIGIN] : []),
    ...ENV_TRUSTED_ORIGINS,
];

const SESSION_COOKIE_CACHE_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours in seconds
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days (how long a session can last overall)
const SESSION_FRESH_AGE_SECONDS = 60 * 60; // 1 hour (or set to 0 to disable completely)
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // 24 hours (how often to refresh the expiry)

const GOOGLE_CLIENT_ID = requiredEnv("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = requiredEnv("GOOGLE_CLIENT_SECRET");

const GOOGLE_PHOTOS_SCOPE =
    "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
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
    providerId: string,
    url: string,
    schema: z.ZodType<T>,
    mapUser: (data: T) => OAuthUserProfile | null,
    extraHeaders: Record<string, string> = {}
): Promise<OAuthUserProfile | null> {
    if (!tokens.accessToken) {
        return null;
    }

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
                ...extraHeaders,
            },
        });
        if (!response.ok) {
            log.warn(`OAuth user fetch failed for ${providerId}`, {
                status: response.status,
                statusText: response.statusText,
                url,
            });
            return null;
        }

        const parseResult = schema.safeParse(await response.json());
        if (!parseResult.success) {
            log.warn(`OAuth user info parse failed for ${providerId}`, {
                url,
            });
            return null;
        }

        return mapUser(parseResult.data);
    } catch (error) {
        log.error(`OAuth user fetch error for ${providerId}`, {
            error: error instanceof Error ? error.message : String(error),
            url,
        });
        return null;
    }
}

// ---------------------------------------------------------------------------
// Pinterest OAuth
// ---------------------------------------------------------------------------

const PinterestUserAccountSchema = z.object({
    id: z.string().optional(),
    profile_image: z.string().nullable().optional(),
    username: z.string().optional(),
});

type PinterestUserAccount = z.infer<typeof PinterestUserAccountSchema>;

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
        image: data.profile_image ?? undefined,
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
                "pinterest",
                "https://api.pinterest.com/v5/user_account",
                PinterestUserAccountSchema,
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

const XUserAccountSchema = z.object({
    data: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            profile_image_url: z.string().optional(),
            username: z.string().optional(),
        })
        .optional(),
});

type XUserAccount = z.infer<typeof XUserAccountSchema>;

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
                "x",
                "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
                XUserAccountSchema,
                mapXUser,
                { Accept: "application/json" }
            ),
        pkce: true,
        providerId: "x",
        scopes: ["bookmark.read", "offline.access", "tweet.read", "users.read"],
        tokenUrl: "https://api.twitter.com/2/oauth2/token",
    };
}

// ---------------------------------------------------------------------------
// GitHub OAuth
// ---------------------------------------------------------------------------

const GitHubUserAccountSchema = z.object({
    avatar_url: z.string().optional(),
    id: z.number().optional(),
    login: z.string().optional(),
    name: z.string().optional(),
});

type GitHubUserAccount = z.infer<typeof GitHubUserAccountSchema>;

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
                "github",
                "https://api.github.com/user",
                GitHubUserAccountSchema,
                mapGitHubUser,
                {
                    Accept: "application/vnd.github+json",
                    "User-Agent": APP_NAME,
                }
            ),
        providerId: "github",
        scopes: ["read:user", "public_repo"],
        tokenUrl: "https://github.com/login/oauth/access_token",
    };
}

// ---------------------------------------------------------------------------
// Notion OAuth
// ---------------------------------------------------------------------------

const NotionUserSchema = z.object({
    avatar_url: z.string().nullable().optional(),
    id: z.string().optional(),
    name: z.string().nullable().optional(),
});

type NotionUser = z.infer<typeof NotionUserSchema>;

function mapNotionUser(data: NotionUser): OAuthUserProfile | null {
    if (!data.id) {
        return null;
    }

    return {
        email: `notion.${data.id}.integration@placeholder.cache`,
        emailVerified: false,
        id: data.id,
        image: data.avatar_url ?? undefined,
        name: data.name ?? "Notion",
    };
}

function buildNotionOAuthConfig(): GenericOAuthConfig | null {
    const creds = getOAuthCredentials("NOTION");
    if (!creds) {
        return null;
    }

    return {
        authentication: "basic",
        authorizationHeaders: {
            "Notion-Version": NOTION_API_VERSION,
        },
        authorizationUrl:
            "https://api.notion.com/v1/oauth/authorize?owner=user",
        ...creds,
        disableSignUp: true,
        getUserInfo: (tokens) =>
            fetchOAuthUser(
                tokens,
                "notion",
                "https://api.notion.com/v1/users/me",
                NotionUserSchema,
                mapNotionUser,
                {
                    "Notion-Version": NOTION_API_VERSION,
                }
            ),
        providerId: "notion",
        tokenUrl: "https://api.notion.com/v1/oauth/token",
    };
}

// ---------------------------------------------------------------------------
// Auth configuration
// ---------------------------------------------------------------------------

const genericOAuthConfig = [
    buildPinterestOAuthConfig(),
    buildXOAuthConfig(),
    buildGitHubOAuthConfig(),
    buildNotionOAuthConfig(),
].filter((config): config is GenericOAuthConfig => config !== null);

const trustedProviders = [
    "google",
    ...genericOAuthConfig.map((c) => c.providerId),
];

const planPriceIds = getPlanPriceIds();

export const auth = betterAuth({
    account: {
        accountLinking: {
            allowDifferentEmails: true,
            enabled: true,
            trustedProviders,
        },
    },
    appName: APP_NAME,
    baseURL: BASE_AUTH_URL,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        await seedBuiltInAutomationsForUser(user.id);
                    } catch (error) {
                        log.error("Failed to seed built-in automations", {
                            error,
                            operation: "seedBuiltInAutomationsForUser",
                            userId: user.id,
                        });
                    }
                },
            },
        },
    },
    plugins: [
        i18nPlugin(),
        multiSession(),
        oneTap({ clientId: GOOGLE_CLIENT_ID }),
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
                        annualDiscountPriceId: planPriceIds.yearly,
                        name: "pro",
                        priceId: planPriceIds.monthly,
                    },
                ],
            },
        }),
        nextCookies(),
    ],
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    session: {
        cookieCache: {
            enabled: true,
            maxAge: SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
        },
        expiresIn: SESSION_EXPIRES_IN_SECONDS,
        freshAge: SESSION_FRESH_AGE_SECONDS,
        updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    socialProviders: {
        google: {
            accessType: "offline",
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            prompt: "select_account consent",
            scope: ["openid", "email", "profile", GOOGLE_PHOTOS_SCOPE],
        },
    },
    trustedOrigins: TRUSTED_ORIGINS,
    user: {
        /**
         * Hard-delete the user row, sessions, and cascading library data
         * when the user explicitly confirms account deletion. OAuth-only
         * sign-in means we rely on `session.freshAge` and the in-product
         * confirmation dialog for authorization instead of a password.
         */
        deleteUser: {
            enabled: true,
        },
    },
});
