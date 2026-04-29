"use client";

import * as React from "react";

// biome-ignore lint/suspicious/noEmptyBlockStatements: NOOP
function doNothing() {}

function getClientSnapshot() {
    return "client";
}

function getServerSnapshot() {
    return "server";
}

function subscribeClientBoundaryStore() {
    return doNothing;
}

function useClientBoundaryValue() {
    return React.useSyncExternalStore(
        subscribeClientBoundaryStore,
        getClientSnapshot,
        getServerSnapshot
    );
}

function useClientOnlyValue<T>(value: T, fallback?: T): T | null {
    const boundaryValue = useClientBoundaryValue();
    return boundaryValue === "server" ? (fallback ?? null) : value;
}

function ClientOnly(props: React.PropsWithChildren) {
    const boundaryValue = useClientBoundaryValue();
    return boundaryValue === "server" ? null : <React.Fragment {...props} />;
}

export { ClientOnly, useClientOnlyValue };
