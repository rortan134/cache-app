"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    authClient,
    HAS_GOOGLE_ONE_TAP_CLIENT_ID,
    useSession,
} from "@/lib/auth/client";
import type { auth } from "@/lib/auth/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import { Info } from "lucide-react";
import Link from "next/link";
import * as React from "react";

const log = createLogger("auth-session");

type Session = typeof auth.$Infer.Session;

/**
 * Boots Google One Tap for anonymous visitors.
 *
 * This component intentionally renders nothing. Mount it once on public entry
 * points where a passive sign-in prompt is desirable; repeated mounts may ask
 * the Google script to initialize more than once.
 */
export function GoogleOneTapTrigger() {
    const { data: session } = useSession();

    React.useEffect(() => {
        if (session || !HAS_GOOGLE_ONE_TAP_CLIENT_ID) {
            return;
        }

        const initOneTap = async () => {
            await authClient.oneTap({
                callbackURL: "/library",
            });
        };

        initOneTap().catch((error) => {
            log.error("Google One Tap init failed", error);
        });
    }, [session]);

    return null;
}

/**
 * Renders children only after the client session is known to be signed out.
 *
 * Use `loadingRender` when the surrounding layout needs a stable placeholder
 * while better-auth resolves the session. Without it, this component renders
 * nothing during the pending state to avoid showing signed-out UI to a signed-in
 * user for a frame.
 */
export function SignedOutOnly({
    children,
    loadingRender = null,
}: SignedOutOnlyProps) {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return loadingRender;
    }

    return session ? null : children;
}

interface SignedOutOnlyProps {
    children: React.ReactNode;
    loadingRender?: React.ReactNode;
}

/**
 * Renders children only after the client session is known to be signed in.
 *
 * This is a presentation gate, not an authorization boundary. Server actions
 * and route handlers must still validate the session before returning private
 * data or mutating state.
 */
export function SignedInOnly({
    children,
    loadingRender = null,
}: SignedInOnlyProps) {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return loadingRender;
    }

    return session ? children : null;
}

interface SignedInOnlyProps {
    children: React.ReactNode;
    loadingRender?: React.ReactNode;
}

/**
 * Renders children only while the client session request is pending.
 *
 * Keep this for small inline affordances. Full-page auth suspense should prefer
 * a route-level loading state so the shell does not churn.
 */
export function SessionLoadingOnly({ children }: React.PropsWithChildren) {
    const { isPending } = useSession();

    return isPending ? children : null;
}

/**
 * Provides the authenticated user to a render function once the session has
 * resolved.
 *
 * The render function receives only `session.user` so call sites do not couple
 * themselves to better-auth's full session payload. Use a server-side session
 * read when the initial render must be personalized without client hydration.
 */
export function WithUserSessionOnly({
    children,
    loadingRender = null,
}: WithUserSessionOnlyProps) {
    const { isPending, data: session } = useSession();

    if (isPending) {
        return loadingRender;
    }

    if (!session?.user) {
        return null;
    }

    return children(session.user);
}

interface WithUserSessionOnlyProps {
    children: (user: Session["user"]) => React.ReactNode;
    loadingRender?: React.ReactNode;
}

/**
 * Displays the current signed-in identity with a logout affordance.
 *
 * Passing `serverSession` prevents the home page from briefly hiding the hint
 * before the client session hydrates. The client session still owns the loading
 * state for the logout button because it reflects the live better-auth request.
 */
export function SessionHint({ serverSession }: SessionHintProps) {
    const { data: clientSession, isPending } = useSession();
    const session = serverSession ?? clientSession;

    if (!session) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Info className="size-4 opacity-50" />
            <p className="font-medium text-xs leading-[1.22] tracking-[-3%] opacity-50">
                You are signed in as{" "}
                {session.user.email ?? <Skeleton>Placeholder</Skeleton>}
                <Button
                    loading={isPending}
                    render={<Link href="/logout">Log out</Link>}
                    size="xs"
                    variant="link"
                />
            </p>
        </div>
    );
}

interface SessionHintProps {
    serverSession?: Session | null;
}
