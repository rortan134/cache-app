import { CACHE_EXTENSION_READY_EVENT } from "@/lib/common/constants";
import { getOwnerWindow } from "@/lib/common/dom";
import { asRecord } from "@/lib/common/objects";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import * as React from "react";

function readExtensionInstalledFlag(ownerWindow: Window): boolean {
    return (
        ownerWindow.document.documentElement.dataset.cacheExtensionInstalled ===
        "true"
    );
}

function hasExtensionReadyMessage(payload: unknown): boolean {
    return asRecord(payload)?.type === CACHE_EXTENSION_READY_EVENT;
}

/**
 * Tracks whether the Cache browser extension is installed by checking a DOM
 * data attribute and listening for extension readiness events.
 */
export function useIsExtensionInstalled(): boolean {
    const [isInstalled, setIsInstalled] = React.useState(false);

    useIsoLayoutEffect(() => {
        if (readExtensionInstalledFlag(getOwnerWindow())) {
            setIsInstalled(true);
        }
    }, []);

    React.useEffect(() => {
        const ownerWindow = getOwnerWindow();
        const markInstalled = () => setIsInstalled(true);

        const handleMessage = (event: MessageEvent) => {
            if (
                event.source !== ownerWindow ||
                !hasExtensionReadyMessage(event.data)
            ) {
                return;
            }

            markInstalled();
        };

        ownerWindow.addEventListener(
            CACHE_EXTENSION_READY_EVENT,
            markInstalled
        );
        ownerWindow.addEventListener("message", handleMessage);

        return () => {
            ownerWindow.removeEventListener(
                CACHE_EXTENSION_READY_EVENT,
                markInstalled
            );
            ownerWindow.removeEventListener("message", handleMessage);
        };
    }, []);

    return isInstalled;
}
