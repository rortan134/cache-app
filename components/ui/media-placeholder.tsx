"use client";

import { cn } from "@/lib/common/cn";
import { djb2Hash } from "@/lib/common/strings";
import { GlobeX } from "lucide-react";
import * as React from "react";

interface MediaPlaceholderStyle extends React.CSSProperties {
    "--texture-position": string;
}

export function MediaPlaceholder({
    className,
    children,
    style,
    ...props
}: React.ComponentProps<"div">) {
    const id = React.useId();
    const hash = djb2Hash(id);
    const x = hash % 101; // x in [0, 100] percent
    const y = (hash >> 8) % 101; // y in [0, 100] percent
    const textureStyle: MediaPlaceholderStyle = {
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
            style={{ ...textureStyle, ...style }}
        >
            {children ?? (
                <GlobeX className="size-6 text-muted-foreground opacity-50" />
            )}
        </div>
    );
}
