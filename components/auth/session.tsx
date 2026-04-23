"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useSession,
    authClient,
    hasGoogleOneTapClientId,
} from "@/lib/auth/client";
import type { auth } from "@/lib/auth/server";
import { Info } from "lucide-react";
import Link from "next/link";
import { type PropsWithChildren, type ReactNode, useEffect } from "react";

type Session = typeof auth.$Infer.Session;

function GoogleOneTapTrigger() {
    const { data: session } = useSession();

    useEffect(() => {
        if (session || !hasGoogleOneTapClientId) {
            return;
        }

        const initOneTap = async () => {
            try {
                await authClient.oneTap({
                    callbackURL: "/library",
                });
            } catch (error) {
                console.error("One Tap error:", error);
            }
        };

        initOneTap();
    }, [session]);

    return null;
}

function SignedOutOnly({
    children,
    loadingRender,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { data: session, isPending } = useSession();

    if (isPending && typeof loadingRender !== "undefined") {
        return loadingRender;
    }

    if (session) {
        return null;
    }

    return children;
}

function SignedInOnly({
    children,
    loadingRender,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { data: session, isPending } = useSession();

    if (isPending && typeof loadingRender !== "undefined") {
        return loadingRender;
    }

    if (session) {
        return children;
    }

    return null;
}

function SessionLoadingOnly({ children }: PropsWithChildren) {
    const { isPending } = useSession();

    if (isPending) {
        return children;
    }

    return null;
}

function SessionHint({ serverSession }: { serverSession?: Session | null }) {
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
                {session?.user.email ?? <Skeleton>Placeholder</Skeleton>}
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

export {
    GoogleOneTapTrigger,
    SessionHint,
    SessionLoadingOnly,
    SignedInOnly,
    SignedOutOnly,
};
