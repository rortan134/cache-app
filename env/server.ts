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
        BETTER_AUTH_SECRET: z.string(),
        BETTER_AUTH_URL: z.url(),
        CRON_SECRET: z.string().optional(),
        DATABASE_URL: z.string().startsWith("postgres://"),
        EMAIL_FROM: z.string().optional(),
        EMAIL_SERVER_HOST: z.string().optional(),
        EMAIL_SERVER_PASSWORD: z.string().optional(),
        EMAIL_SERVER_PORT: z.string().optional(),
        EMAIL_SERVER_USER: z.string().optional(),
        GEMINI_API_KEY: z.string(),
        GITHUB_CLIENT_ID: z.string().optional(),
        GITHUB_CLIENT_SECRET: z.string().optional(),
        GOOGLE_CLIENT_ID: z.string(),
        GOOGLE_CLIENT_SECRET: z.string().startsWith("G"),
        GT_API_KEY: z.string(),
        GT_PROJECT_ID: z.string(),
        NOTION_CLIENT_ID: z.string().optional(),
        NOTION_CLIENT_SECRET: z.string().optional(),
        PINTEREST_CLIENT_ID: z.string().optional(),
        PINTEREST_CLIENT_SECRET: z.string().optional(),
        STRIPE_PRICE_ID_MONTHLY: z.string().startsWith("price_"),
        STRIPE_PRICE_ID_YEARLY: z.string().startsWith("price_"),
        STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
        STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
        TAVILY_API_KEY: z.string().optional(),
        X_CLIENT_ID: z.string().optional(),
        X_CLIENT_SECRET: z.string().optional(),
    },
    shared: {
        NODE_ENV: z.enum(["development", "test", "production"]),
    },
});
