import { clientEnv } from "@/env/client";
import type { auth } from "@/lib/auth/server";
import { BASE_URL } from "@/lib/common/constants";
import { stripeClient } from "@better-auth/stripe/client";
import {
    genericOAuthClient,
    inferAdditionalFields,
    multiSessionClient,
    oneTapClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = `${BASE_URL}/api/auth`;
const GOOGLE_ONE_TAP_CLIENT_ID = clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
export const HAS_GOOGLE_ONE_TAP_CLIENT_ID = !!GOOGLE_ONE_TAP_CLIENT_ID;

export const authClient = createAuthClient({
    baseURL,
    plugins: [
        inferAdditionalFields<typeof auth>(),
        genericOAuthClient(),
        multiSessionClient(),
        stripeClient({ subscription: true }),
        ...(GOOGLE_ONE_TAP_CLIENT_ID
            ? [oneTapClient({ clientId: GOOGLE_ONE_TAP_CLIENT_ID })]
            : []),
    ],
});

export const { signIn, signOut, useSession } = authClient;
