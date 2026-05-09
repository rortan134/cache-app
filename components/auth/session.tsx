"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    authClient,
    hasGoogleOneTapClientId,
    useSession,
} from "@/lib/auth/client";
import type { auth } from "@/lib/auth/server";
import { createLogger } from "@/lib/common/logs/console/logger";
import { Info } from "lucide-react";
import Link from "next/link";
import { useEffect, type PropsWithChildren, type ReactNode } from "react";

type Session = typeof auth.$Infer.Session;

const log = createLogger("auth-session");

export function GoogleOneTapTrigger() {
    const { data: session } = useSession();

    useEffect(() => {
        if (session || !hasGoogleOneTapClientId) {
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

export function SignedOutOnly({
    children,
    loadingRender = null,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return loadingRender;
    }

    return session ? null : children;
}

export function SignedInOnly({
    children,
    loadingRender = null,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return loadingRender;
    }

    return session ? children : null;
}

export function SessionLoadingOnly({ children }: PropsWithChildren) {
    const { isPending } = useSession();

    return isPending ? children : null;
}

export function WithUserSessionOnly({
    children,
    loadingRender = null,
}: {
    children: (user: Session["user"]) => ReactNode;
    loadingRender?: ReactNode;
}) {
    const { isPending, data: session } = useSession();

    if (isPending) {
        return loadingRender;
    }

    if (!session?.user) {
        return null;
    }

    return children(session.user);
}

export function SessionHint({
    serverSession,
}: {
    serverSession?: Session | null;
}) {
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
