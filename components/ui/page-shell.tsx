import { cn } from "@/lib/common/cn";
import type * as React from "react";

export function PageShell({
    className,
    as: Comp = "main",
    ...props
}: React.ComponentProps<"main"> & { as?: React.ElementType }) {
    return (
        <Comp
            {...props}
            className={cn(
                "relative isolate z-0 mx-auto flex size-full min-h-screen flex-col leading-snug tracking-tight outline-none [-webkit-user-drag:none] focus-visible:outline-none",
                className
            )}
            id="main"
            tabIndex={-1}
        />
    );
}
