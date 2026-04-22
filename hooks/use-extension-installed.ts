import { CACHE_EXTENSION_READY_EVENT } from "@/lib/common/constants";
import { canUseDOM, getOwnerWindow } from "@/lib/common/dom";
import { asRecord } from "@/lib/common/objects";
import * as React from "react";

const useClientLayoutEffect = canUseDOM
    ? React.useLayoutEffect
    : React.useEffect;

function readExtensionInstalledFlag(ownerWindow: Window): boolean {
    return (
        ownerWindow.document.documentElement.dataset.cacheExtensionInstalled ===
        "true"
    );
}

function hasExtensionReadyMessage(payload: unknown): boolean {
    return asRecord(payload)?.type === CACHE_EXTENSION_READY_EVENT;
}

export function useIsExtensionInstalled(): boolean {
    const [isInstalled, setIsInstalled] = React.useState(false);

    useClientLayoutEffect(() => {
        if (!canUseDOM) {
            return;
        }

        if (readExtensionInstalledFlag(getOwnerWindow())) {
            setIsInstalled(true);
        }
    }, []);

    React.useEffect(() => {
        if (!canUseDOM) {
            return;
        }

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
