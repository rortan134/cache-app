"use client";

import * as React from "react";
import { useStableCallback } from "@base-ui/utils/useStableCallback";

const HISTORY_LIMIT = 10;

const STORAGE_KEY = "cache:lastVisitedItemIds";

let listeners: Array<() => void> = [];
let cachedSnapshot: string[] | null | undefined;

function readLastVisitedItemIds(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [raw];
    } catch {
        return [];
    }
}

function writeLastVisitedItemIds(ids: string[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // storage unavailable
    }
}

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

function getSnapshot(): string[] {
    // `undefined` distinguishes "not yet read" from a real `[]` (no
    // stored items), so the first read hits storage exactly once per
    // change.
    if (cachedSnapshot === undefined) {
        cachedSnapshot = readLastVisitedItemIds();
    }
    return cachedSnapshot ?? [];
}

function getServerSnapshot(): string[] {
    return [];
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
    lastVisitedItemIds: string[];
    markVisited: (itemId: string) => void;
} {
    const lastVisitedItemIds = React.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    const markVisited = useStableCallback((itemId: string) => {
        const next = [
            itemId,
            ...lastVisitedItemIds.filter((id) => id !== itemId),
        ].slice(0, HISTORY_LIMIT);
        cachedSnapshot = next;
        writeLastVisitedItemIds(next);
        emitChange();
    });

    const isLastVisited = (itemId: string): boolean =>
        itemId === lastVisitedItemIds[0];

    return { isLastVisited, lastVisitedItemIds, markVisited };
}
