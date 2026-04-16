import { getOwnerWindow } from "@/lib/dom";
import copy from "copy-to-clipboard";
import * as React from "react";

function useCopyToClipboard({
    timeout = 2000,
    onCopy,
}: {
    timeout?: number;
    onCopy?: () => void;
} = {}): { copyToClipboard: (value: string) => void; isCopied: boolean } {
    const [isCopied, setIsCopied] = React.useState(false);
    const timeoutIdRef = React.useRef<number | null>(null);

    const copyToClipboard = (value: string): void => {
        const window = getOwnerWindow();
        if (typeof window === "undefined") {
            return;
        }

        if (!value) {
            return;
        }

        const immediate = copy(value);

        if (!immediate) {
            return;
        }

        if (timeoutIdRef.current) {
            window.clearTimeout(timeoutIdRef.current);
        }
        setIsCopied(true);
        onCopy?.();

        if (timeout !== 0) {
            timeoutIdRef.current = window.setTimeout(() => {
                setIsCopied(false);
                timeoutIdRef.current = null;
            }, timeout);
        }
    };

    React.useEffect(() => {
        return (): void => {
            if (timeoutIdRef.current) {
                getOwnerWindow().clearTimeout(timeoutIdRef.current);
            }
        };
    }, []);

    return { copyToClipboard, isCopied };
}

export { useCopyToClipboard };
