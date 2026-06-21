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
 * Mount once on public entry points. Repeated mounts may initialize Google's
 * script more than once.
 */
export function GoogleOneTapTrigger() {
    const { data: session, isPending } = useSession();
    const sessionId = session?.session?.id;

    React.useEffect(() => {
        if (isPending || sessionId || !HAS_GOOGLE_ONE_TAP_CLIENT_ID) {
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
    }, [isPending, sessionId]);

    return null;
}

/**
 * Pass `loadingRender` to avoid showing signed-out UI to a signed-in user for a
 * frame while the session resolves.
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
 * This is a presentation gate, not an authorization boundary. Validate sessions
 * on the server before returning private data.
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
 * Use for small inline affordances. Prefer route-level loading for full-page
 * suspense to avoid shell churn.
 */
export function SessionLoadingOnly({ children }: React.PropsWithChildren) {
    const { isPending } = useSession();

    return isPending ? children : null;
}

/**
 * Receives only `session.user` to decouple call sites from better-auth's full
 * payload. Use a server-side session read for personalized initial renders.
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
 * Pass `serverSession` to prevent layout shift before client hydration. The
 * client session still owns the logout button's loading state as it reflects
 * the live request.
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
            <div className="font-medium text-xs leading-tight tracking-[-3%] opacity-50">
                You are signed in as{" "}
                {session.user.email ?? <Skeleton>Placeholder</Skeleton>}
                <Button
                    loading={isPending}
                    render={
                        <Link href="/logout" prefetch={false}>
                            Log out
                        </Link>
                    }
                    size="xs"
                    variant="link"
                />
            </div>
        </div>
    );
}

interface SessionHintProps {
    serverSession?: Session | null;
}
