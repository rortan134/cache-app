"use client";

import * as React from "react";
import { useStableCallback } from "@base-ui/utils/useStableCallback";

const STORAGE_KEY = "cache:lastVisitedItemId";

let listeners: Array<() => void> = [];
let cachedSnapshot: string | null | undefined;

function readLastVisitedItemId(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function writeLastVisitedItemId(itemId: string): void {
    try {
        localStorage.setItem(STORAGE_KEY, itemId);
    } catch {
        // storage unavailable
    }
}

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

function getSnapshot(): string | null {
    // `undefined` distinguishes "not yet read" from a real `null` (the
    // stored value is genuinely missing), so the first read hits storage
    // exactly once per change.
    if (cachedSnapshot === undefined) {
        cachedSnapshot = readLastVisitedItemId();
    }
    return cachedSnapshot;
}

function getServerSnapshot(): string | null {
    // localStorage is unavailable during SSR
    return null;
}

function subscribe(listener: () => void): () => void {
    listeners.push(listener);

    // The `storage` event only fires in *other* documents, so in-tab
    // updates from `markVisited` reach other instances through `emitChange`
    // instead.
    const handleStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === STORAGE_KEY) {
            cachedSnapshot = undefined;
            listener();
        }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
        listeners = listeners.filter((l) => l !== listener);
        window.removeEventListener("storage", handleStorage);
    };
}

export function useLastVisited(): {
    isLastVisited: (itemId: string) => boolean;
    markVisited: (itemId: string) => void;
} {
    const lastVisitedItemId = React.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    const markVisited = useStableCallback((itemId: string) => {
        writeLastVisitedItemId(itemId);
        cachedSnapshot = itemId;
        emitChange();
    });

    const isLastVisited = React.useCallback(
        (itemId: string): boolean => lastVisitedItemId === itemId,
        [lastVisitedItemId]
    );

    return { isLastVisited, markVisited };
}
