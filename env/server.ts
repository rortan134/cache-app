import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import * as z from "zod";

export const serverEnv = createEnv({
    emptyStringAsUndefined: true,
    experimental__runtimeEnv: process.env,
    extends: [vercel()],
    server: {
        AI_GATEWAY_API_KEY: z.string().optional(),
        ARCJET_KEY: z.string().startsWith("ajkey_"),

        BETTER_AUTH_SECRET: z.string(), // Secret key for Better Auth JWT signing
        BETTER_AUTH_URL: z.url(), // Base URL for Better Auth service
        CRON_SECRET: z.string().optional(),

        DATABASE_URL: z.string().startsWith("postgres://"),

        EMAIL_FROM: z.string().optional(), // Default email sender address
        EMAIL_SERVER_HOST: z.string().optional(), // SMTP server host
        EMAIL_SERVER_PASSWORD: z.string().optional(), // SMTP server password
        EMAIL_SERVER_PORT: z.string().optional(), // SMTP server port
        EMAIL_SERVER_USER: z.string().optional(), // SMTP server username

        GEMINI_API_KEY: z.string(),
        GITHUB_CLIENT_ID: z.string().optional(),
        GITHUB_CLIENT_SECRET: z.string().optional(),
        GOOGLE_CLIENT_ID: z.string(),
        GOOGLE_CLIENT_SECRET: z.string().startsWith("G"),

        // Internationalization
        GT_API_KEY: z.string(),
        GT_PROJECT_ID: z.string(),

        PINTEREST_CLIENT_ID: z.string().optional(),
        PINTEREST_CLIENT_SECRET: z.string().optional(),

        STRIPE_PRICE_ID_MONTHLY: z.string().startsWith("price_"), // Stripe price ID for monthly subscription
        STRIPE_PRICE_ID_YEARLY: z.string().startsWith("price_"), // Stripe price ID for yearly subscription
        STRIPE_SECRET_KEY: z.string().startsWith("sk_"), // Stripe secret key for payment processing
        STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"), // Webhook secret for Stripe events

        TAVILY_API_KEY: z.string().optional(),
        X_CLIENT_ID: z.string().optional(),
        X_CLIENT_SECRET: z.string().optional(),
    },
    // Variables available on both server and client
    shared: {
        NODE_ENV: z.enum(["development", "test", "production"]),
    },
});
