import { CACHE_EXTENSION_READY_EVENT } from "@/lib/common/constants";
import { getOwnerWindow } from "@/lib/common/dom";
import { asRecord } from "@/lib/common/objects";
import * as React from "react";

export function useIsExtensionInstalled() {
    const [isInstalled, setIsInstalled] = React.useState(false);

    React.useEffect(() => {
        const ownerWindow = getOwnerWindow();
        if (!ownerWindow) {
            return;
        }

        const handleReady = () => setIsInstalled(true);

        const handleMessage = (event: MessageEvent) => {
            if (event.source !== ownerWindow) {
                return;
            }

            const payload = asRecord(event.data);
            if (payload?.type === CACHE_EXTENSION_READY_EVENT) {
                handleReady();
            }
        };

        // Check if already installed before subscribing
        if (
            ownerWindow.document.documentElement.dataset
                .cacheExtensionInstalled === "true"
        ) {
            handleReady();
        }

        ownerWindow.addEventListener(CACHE_EXTENSION_READY_EVENT, handleReady);
        ownerWindow.addEventListener("message", handleMessage);

        return () => {
            ownerWindow.removeEventListener(
                CACHE_EXTENSION_READY_EVENT,
                handleReady
            );
            ownerWindow.removeEventListener("message", handleMessage);
        };
    }, []);

    return isInstalled;
}
