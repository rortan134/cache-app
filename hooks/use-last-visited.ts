"use client";

import * as React from "react";
import { useStableCallback } from "@base-ui/utils/useStableCallback";

const STORAGE_KEY = "cache:lastVisitedItemId";

function getLastVisitedItemId(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function setLastVisitedItemId(itemId: string): void {
    try {
        localStorage.setItem(STORAGE_KEY, itemId);
    } catch {
        // storage unavailable
    }
}

export function useLastVisited(): {
    isLastVisited: (itemId: string) => boolean;
    markVisited: (itemId: string) => void;
} {
    const [lastVisitedItemId, setLastVisitedItemIdState] = React.useState<
        string | null
    >(getLastVisitedItemId);

    React.useEffect(() => {
        const handler = (event: StorageEvent) => {
            if (event.key === null || event.key === STORAGE_KEY) {
                setLastVisitedItemIdState(getLastVisitedItemId());
            }
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    const markVisited = useStableCallback((itemId: string) => {
        setLastVisitedItemId(itemId);
        setLastVisitedItemIdState(itemId);
    });

    const isLastVisited = useStableCallback(
        (itemId: string): boolean => lastVisitedItemId === itemId
    );

    return { isLastVisited, markVisited };
}
