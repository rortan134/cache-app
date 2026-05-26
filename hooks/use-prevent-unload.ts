import { getOwnerWindow } from "@/lib/common/dom";
import * as React from "react";

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    // Modern browsers show a generic message and ignore this value.
    // But it's required for older browser compatibility.
    event.returnValue = "";
    return "";
};

export const usePreventWindowUnload = (
    isEnabled: boolean | (() => boolean) = true
) => {
    React.useEffect(() => {
        const enabled =
            typeof isEnabled === "function" ? isEnabled() : isEnabled;

        if (!enabled) {
            return;
        }

        const ownerWindow = getOwnerWindow();
        ownerWindow.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            ownerWindow.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isEnabled]);
};
