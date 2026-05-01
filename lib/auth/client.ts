import { stripeClient } from "@better-auth/stripe/client";
import { genericOAuthClient, oneTapClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth`;
const googleOneTapClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
export const hasGoogleOneTapClientId = !!googleOneTapClientId;

export const authClient = createAuthClient({
    baseURL,
    plugins: [
        genericOAuthClient(),
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
