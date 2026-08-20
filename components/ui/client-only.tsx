"use client";

import * as React from "react";

function useClientBoundaryValue() {
    return React.useSyncExternalStore(
        () => () => {
            // No-op
        },
        () => "client",
        () => "server"
    );
}

export function useClientOnlyValue<T>(value: T, fallback?: T): T | null {
    const boundaryValue = useClientBoundaryValue();
    return boundaryValue === "server" ? (fallback ?? null) : value;
}

export function ClientOnly({ children }: React.PropsWithChildren) {
    const boundaryValue = useClientBoundaryValue();
    return boundaryValue === "server" ? null : children;
}
