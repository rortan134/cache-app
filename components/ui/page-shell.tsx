import { cn } from "@/lib/common/cn";
import type * as React from "react";

const PageShell = ({
    className,
    as: Comp = "main",
    ...props
}: React.ComponentProps<"main"> & { as?: React.ElementType }) => (
    <Comp
        {...props}
        className={cn(
            "isolate z-0 mx-auto flex size-full min-h-screen flex-col leading-snug tracking-tight outline-hidden [-webkit-user-drag:none] focus-visible:outline-hidden",
            className
        )}
        id="main"
        tabIndex={-1}
    />
);

export { PageShell };
