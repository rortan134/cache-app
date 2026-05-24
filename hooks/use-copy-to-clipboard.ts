import { canUseDOM } from "@/lib/common/dom";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import copy from "copy-to-clipboard";
import * as React from "react";

interface UseCopyToClipboardOptions {
    onCopy?: () => void;
    timeout?: number;
}

interface UseCopyToClipboardResult {
    copyToClipboard: (value: string) => Promise<boolean>;
    isCopied: boolean;
}

/**
 * Copies text to the clipboard and provides a transient `isCopied` state.
 * Resets automatically after the configured timeout.
 */
export function useCopyToClipboard({
    timeout = 2000,
    onCopy: onCopyProp,
}: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
    const [isCopied, setIsCopied] = React.useState(false);
    const timeoutManager = useTimeout();
    const onCopy = useStableCallback(onCopyProp);
    const timeoutRef = useValueAsRef(timeout);

    const copyToClipboard = async (value: string) => {
        if (!(canUseDOM && value)) {
            return false;
        }
        timeoutManager.clear();

        const success = await copy(value);
        if (!success) {
            return false;
        }

        setIsCopied(true);
        onCopy();

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
