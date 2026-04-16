import { CACHE_EXTENSION_READY_EVENT } from "@/lib/constants";
import { getOwnerWindow } from "@/lib/dom";
import * as React from "react";

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : null;
}

function getIsExtensionInstalled() {
    return document.documentElement.dataset.cacheExtensionInstalled === "true";
}

export function useIsExtensionInstalled() {
    const [extensionInstalled, setExtensionInstalled] = React.useState(false);

    React.useEffect(() => {
        const window = getOwnerWindow();
        const handleReady = () => {
            setExtensionInstalled(true);
        };

        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) {
                return;
            }

            const payload = asRecord(event.data);
            if (payload?.type === CACHE_EXTENSION_READY_EVENT) {
                handleReady();
            }
        };

        setExtensionInstalled(getIsExtensionInstalled());
        window.addEventListener(CACHE_EXTENSION_READY_EVENT, handleReady);
        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener(
                CACHE_EXTENSION_READY_EVENT,
                handleReady
            );
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    return extensionInstalled;
}
