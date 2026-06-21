import type * as React from "react";

export function AuthErrorMessage(props: React.ComponentProps<"p">) {
    if (!props.children) {
        return null;
    }

    return (
        <p
            {...props}
            aria-live="polite"
            className="text-destructive text-sm underline decoration-dotted underline-offset-4"
            role="status"
        />
    );
}
