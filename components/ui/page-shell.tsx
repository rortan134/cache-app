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
                "fade-in relative isolate z-0 mx-auto flex size-full min-h-screen animate-in flex-col leading-snug tracking-tight outline-none [-webkit-user-drag:none] focus-visible:outline-none motion-reduce:animate-none",
                className
            )}
            id="main-content"
            tabIndex={-1}
        />
    );
}
