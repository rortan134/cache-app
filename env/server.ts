import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import * as z from "zod";

export const serverEnv = createEnv({
    emptyStringAsUndefined: true,
    experimental__runtimeEnv: process.env,
    extends: [vercel()],
    server: {
        ARCJET_KEY: z.string().startsWith("ajkey_").optional(),
        BETTER_AUTH_SECRET: z.string(), // Secret key for Better Auth JWT signing
        BETTER_AUTH_URL: z.url(), // Base URL for Better Auth service

        DATABASE_URL: z.string().startsWith("postgres://"),

        GEMINI_API_KEY: z.string(),
        GOOGLE_CLIENT_ID: z.string(),
        GOOGLE_CLIENT_SECRET: z.string(),

        GT_API_KEY: z.string(),
        GT_PROJECT_ID: z.string(),

        PINTEREST_CLIENT_ID: z.string().optional(),
        PINTEREST_CLIENT_SECRET: z.string().optional(),

        STRIPE_PRICE_ID_MONTHLY: z.string().startsWith("price_"), // Stripe price ID for monthly subscription
        STRIPE_PRICE_ID_YEARLY: z.string().startsWith("price_"), // Stripe price ID for yearly subscription
        STRIPE_SECRET_KEY: z.string().startsWith("sk_"), // Stripe secret key for payment processing
        STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"), // Webhook secret for Stripe events
    },
    // Variables available on both server and client
    shared: {
        NODE_ENV: z.enum(["development", "test", "production"]),
    },
});
