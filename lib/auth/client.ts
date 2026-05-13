import { clientEnv } from "@/env/client";
import type { auth } from "@/lib/auth/server";
import { stripeClient } from "@better-auth/stripe/client";
import {
    genericOAuthClient,
    inferAdditionalFields,
    multiSessionClient,
    oneTapClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = `${clientEnv.NEXT_PUBLIC_APP_URL}/api/auth`;
const googleOneTapClientId = clientEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
export const hasGoogleOneTapClientId = !!googleOneTapClientId;

export const authClient = createAuthClient({
    baseURL,
    plugins: [
        inferAdditionalFields<typeof auth>(),
        genericOAuthClient(),
        multiSessionClient(),
        stripeClient({ subscription: true }),
        ...(googleOneTapClientId
            ? [
                  oneTapClient({
                      clientId: googleOneTapClientId,
                  }),
              ]
            : []),
    ],
});

export const { signIn, signOut, useSession } = authClient;
