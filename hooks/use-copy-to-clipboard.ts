import { canUseDOM } from "@/lib/common/dom";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import copy from "copy-to-clipboard";
import * as React from "react";

interface UseCopyToClipboardOptions {
    onCopy?: () => void;
    timeout?: number;
}

interface UseCopyToClipboardResult {
    copyToClipboard: (value: string) => boolean;
    isCopied: boolean;
}

/**
 * Copies text to the clipboard and provides a transient `isCopied` state.
 * Resets automatically after the configured timeout.
 */
export function useCopyToClipboard({
    timeout = 2000,
    onCopy,
}: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
    const [isCopied, setIsCopied] = React.useState(false);
    const timeoutManager = useTimeout();
    const onCopyRef = useValueAsRef(onCopy);
    const timeoutRef = useValueAsRef(timeout);

    const copyToClipboard = (value: string) => {
        if (!(canUseDOM && value)) {
            return false;
        }

        const success = copy(value);
        if (!success) {
            return false;
        }

        timeoutManager.clear();

        setIsCopied(true);
        onCopyRef.current?.();

        const timeoutMs = timeoutRef.current;
        if (timeoutMs !== 0) {
            timeoutManager.start(timeoutMs, () => {
                setIsCopied(false);
            });
        }

        return true;
    };

    return { copyToClipboard, isCopied };
}
