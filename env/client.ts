import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const clientEnv = createEnv({
    client: {
        NEXT_PUBLIC_APP_URL: z.url(),

        NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string(),

        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
    },
    emptyStringAsUndefined: true,
    extends: [vercel()],
    runtimeEnv: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        NODE_ENV: process.env.NODE_ENV,
    },
    // Variables available on both server and client
    shared: {
        NODE_ENV: z.enum(["development", "test", "production"]),
    },
});
