import { getOwnerWindow } from "@/lib/dom";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import { useTimeout } from "@base-ui/utils/useTimeout";
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
    const timeoutManager = useTimeout();
    const onCopyRef = useValueAsRef(onCopy);
    const durationRef = useValueAsRef(timeout);

    const copyToClipboard = (value: string) => {
        const ownerWindow = getOwnerWindow();

        if (!(ownerWindow && value)) {
            return;
        }

        const success = copy(value);
        if (!success) {
            return;
        }

        timeoutManager.clear();

        setIsCopied(true);
        onCopyRef.current?.();

        const duration = durationRef.current;
        if (duration !== 0) {
            timeoutManager.start(duration, () => {
                setIsCopied(false);
            });
        }
    };

    return { copyToClipboard, isCopied };
}
