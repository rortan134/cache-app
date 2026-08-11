import type * as React from "react";
import { cn } from "@/lib/common/cn";

export function FadeIn({ className, ...props }: React.ComponentProps<"div">) {
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
