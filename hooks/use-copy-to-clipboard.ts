import { getOwnerWindow } from "@/lib/dom";
import copy from "copy-to-clipboard";
import * as React from "react";

interface UseCopyToClipboardOptions {
    onCopy?: () => void;
    timeout?: number;
}

interface UseCopyToClipboardResult {
    copyToClipboard: (value: string) => void;
    isCopied: boolean;
}

export function useCopyToClipboard({
    timeout = 2000,
    onCopy,
}: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
    const [isCopied, setIsCopied] = React.useState(false);
    const timeoutRef = React.useRef<number | null>(null);

    const onCopyRef = React.useRef(onCopy);
    const durationRef = React.useRef(timeout);
    React.useEffect(() => {
        onCopyRef.current = onCopy;
        durationRef.current = timeout;
    }, [onCopy, timeout]);

    const copyToClipboard = React.useCallback((value: string) => {
        const ownerWindow = getOwnerWindow();

        if (!(ownerWindow && value)) {
            return;
        }

        const success = copy(value);
        if (!success) {
            return;
        }

        if (timeoutRef.current) {
            ownerWindow.clearTimeout(timeoutRef.current);
        }

        setIsCopied(true);
        onCopyRef.current?.();

        const duration = durationRef.current;
        if (duration !== 0) {
            timeoutRef.current = ownerWindow.setTimeout(() => {
                setIsCopied(false);
                timeoutRef.current = null;
            }, duration);
        }
    }, []);

    React.useEffect(
        () => () => {
            if (timeoutRef.current) {
                const ownerWindow = getOwnerWindow();
                ownerWindow?.clearTimeout(timeoutRef.current);
            }
        },
        []
    );

    return { copyToClipboard, isCopied };
}
