import { useTimeout } from "@base-ui/utils/useTimeout";
import * as React from "react";

/**
 * Returns `value` delayed by `delayMs` (trailing). Updates reset the timer.
 * Initial render mirrors `value` immediately.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    const timeout = useTimeout();

    React.useEffect(() => {
        timeout.start(delayMs, () => {
            setDebouncedValue(value);
        });
        return timeout.clear;
    }, [value, delayMs, timeout]);

    return debouncedValue;
}
