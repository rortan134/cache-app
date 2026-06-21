import { cn } from "@/lib/common/cn";
import type * as React from "react";

export function AuthErrorMessage({
    className,
    ...props
}: React.ComponentProps<"p">) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            {...props}
            aria-live="assertive"
            className={cn(
                "text-destructive text-sm underline decoration-dotted underline-offset-4",
                className
            )}
            role="alert"
        />
    );
}
