import { cn } from "@/lib/common/cn";
import type * as React from "react";

export function FadeIn({
    className,
    ...props
}: React.ComponentProps<"div">): React.ReactElement {
    return (
        <div
            {...props}
            className={cn(
                "fade-in animate-in duration-300 motion-reduce:animate-none",
                className
            )}
        />
    );
}
