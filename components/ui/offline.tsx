"use client";

import { RadioOff } from "lucide-react";
import { useOffline } from "next/offline";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Renders `children` only while the app is offline. There is no loading
 * state: `useOffline` starts `false` on the server and hydrates in sync, so
 * the online shell never flashes before the true state applies.
 */
export function OfflineOnly({ children }: React.PropsWithChildren) {
    return useOffline() ? children : null;
}

/**
 * Renders `children` only while the app is online. Invert `OfflineOnly` for
 * affordances like "retry now" buttons that only make sense with a
 * connection.
 */
export function OnlineOnly({ children }: React.PropsWithChildren) {
    return useOffline() ? null : children;
}

export function OfflineBadge() {
    return (
        <OfflineOnly>
            <Badge
                aria-live="assertive"
                role="alert"
                title="You are offline. Any changes you make may be lost until you regain connectivity."
                variant="outline"
            >
                <RadioOff aria-hidden className="size-4" focusable="false" />
                <span data-sidebar-collapsible="">Offline</span>
            </Badge>
        </OfflineOnly>
    );
}
