"use client";

import { cn } from "@/lib/common/cn";
import { djb2Hash } from "@/lib/common/colors";
import * as React from "react";

export function MediaPlaceholder({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const id = React.useId();
    const hash = djb2Hash(id);
    const x = hash % 101; // x in [0, 100] percent
    const y = (hash >> 8) % 101; // y in [0, 100] percent
    const cssVars: React.CSSProperties & Record<string, string> = {
        "--texture-position": `${x}% ${y}%`,
    };

    return (
        <div
            {...props}
            className={cn(
                "texture-screen relative flex size-full flex-col items-center justify-center gap-2 bg-muted/80",
                className
            )}
            data-slot="media-placeholder"
            style={cssVars}
        />
    );
}
