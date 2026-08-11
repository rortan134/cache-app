import { stripeClient } from "@better-auth/stripe/client";
import {
    genericOAuthClient,
    inferAdditionalFields,
    multiSessionClient,
    oneTapClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clientEnv } from "@/env/client";
import type { auth } from "@/lib/auth/server";

const GOOGLE_ONE_TAP_CLIENT_ID = clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
export const HAS_GOOGLE_ONE_TAP_CLIENT_ID = !!GOOGLE_ONE_TAP_CLIENT_ID;

export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields<typeof auth>(),
        genericOAuthClient(),
        multiSessionClient(),
        stripeClient({ subscription: true }),
        ...(GOOGLE_ONE_TAP_CLIENT_ID
            ? [oneTapClient({ clientId: GOOGLE_ONE_TAP_CLIENT_ID })]
            : []),
    ],
    sessionOptions: {
        refetchOnWindowFocus: false,
    },
});

export const { signIn, signOut, useSession } = authClient;
