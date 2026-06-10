import { cn } from "@/lib/common/cn";
import { djb2Hash } from "@/lib/common/colors";
import { GlobeOff } from "lucide-react";
import * as React from "react";

export function MediaPlaceholder({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const id = React.useId();
    const hash = djb2Hash(id);
    const x = 5 + (hash % 66);
    const y = (hash >> 8) % 46;

    return (
        <div
            {...props}
            className={cn(
                "texture-screen relative flex size-full flex-col items-center justify-center gap-2 bg-muted",
                className
            )}
            data-slot="media-placeholder"
            style={
                { "--texture-position": `${x}% ${y}%` } as React.CSSProperties
            }
        >
            <GlobeOff className="z-1 size-6 text-muted-foreground/50" />
        </div>
    );
}
