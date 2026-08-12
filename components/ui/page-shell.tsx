import type * as React from "react";
import { cn } from "@/lib/common/cn";

interface PageShellProps extends React.ComponentProps<"main"> {
    as?: React.ElementType;
}

export function PageShell({
    className,
    as: Comp = "main",
    ...props
}: PageShellProps) {
    return (
        <Comp
            {...props}
            className={cn(
                "relative isolate z-0 mx-auto flex size-full min-h-dvh flex-col leading-snug tracking-tight outline-none [-webkit-user-drag:none] focus-visible:outline-none motion-reduce:animate-none",
                className
            )}
            id="main"
            tabIndex={-1}
        />
    );
}
