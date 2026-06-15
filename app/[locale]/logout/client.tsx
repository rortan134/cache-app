"use client";

import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth/client";
import { createLogger } from "@/lib/common/logs/console/logger";
import { T } from "gt-next";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const log = createLogger("logout-page-client");

export function LogoutPageClient() {
    const router = useRouter();
    const isMountedRef = useRef(false);

    useEffect(() => {
        if (isMountedRef.current) {
            return;
        }
        isMountedRef.current = true;

        const performLogout = async () => {
            try {
                await authClient.signOut();
                router.push("/");
                router.refresh();
            } catch (error) {
                log.error("signOut failed", error);
                router.push("/");
            }
        };

        performLogout();
    }, [router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-4">
                <div aria-hidden>
                    <Spinner className="size-8" />
                </div>
                <p className="text-muted-foreground text-sm">
                    <T context="Logout redirect page">Signing out…</T>
                </p>
            </div>
        </div>
    );
}
