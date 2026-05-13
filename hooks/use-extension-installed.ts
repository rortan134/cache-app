import { CACHE_EXTENSION_READY_EVENT } from "@/lib/common/constants";
import { getOwnerWindow } from "@/lib/common/dom";
import * as React from "react";

function readExtensionInstalledFlag(window: Window): boolean {
    try {
        return (
            window.document.documentElement.dataset.cacheExtensionInstalled ===
            "true"
        );
    } catch {
        // If accessing the object fails, the extension is likely not installed
        return false;
    }
}

// function hasExtensionReadyMessage(payload: unknown): boolean {
//     return asRecord(payload)?.type === CACHE_EXTENSION_READY_EVENT;
// }

function subscribe(callbackFn: () => void) {
    const ownerWindow = getOwnerWindow();

    ownerWindow.addEventListener(CACHE_EXTENSION_READY_EVENT, callbackFn);
    ownerWindow.addEventListener("message", callbackFn);

    return () => {
        ownerWindow.removeEventListener(
            CACHE_EXTENSION_READY_EVENT,
            callbackFn
        );
        ownerWindow.removeEventListener("message", callbackFn);
    };
}

/**
 * Tracks whether the Cache browser extension is installed by checking a DOM
 * data attribute and listening for extension readiness events.
 */
export function useIsExtensionInstalled(): boolean {
    const isInstalled = React.useSyncExternalStore(
        subscribe,
        () => readExtensionInstalledFlag(getOwnerWindow()),
        () => false
    );

    return isInstalled;
}
