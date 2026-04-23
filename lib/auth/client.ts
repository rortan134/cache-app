import { stripeClient } from "@better-auth/stripe/client";
import { genericOAuthClient, oneTapClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth`;
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
const hasGoogleOneTapClientId = !!googleClientId;

export const authClient = createAuthClient({
    baseURL,
    plugins: [
        genericOAuthClient(),
        stripeClient({ subscription: true }),
        ...(hasGoogleOneTapClientId
            ? [
                  oneTapClient({
                      // biome-ignore lint/style/noNonNullAssertion: guarded by hasGoogleOneTapClientId
                      clientId: googleClientId!,
                  }),
              ]
            : []),
    ],
});

export const { signIn, signOut, useSession } = authClient;

export { hasGoogleOneTapClientId };
