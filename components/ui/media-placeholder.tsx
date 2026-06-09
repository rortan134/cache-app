import { cn } from "@/lib/common/cn";
import { GlobeOff } from "lucide-react";
import type * as React from "react";

export function MediaPlaceholder({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            {...props}
            className={cn(
                "texture-screen relative flex size-full flex-col items-center justify-center gap-2 bg-muted",
                className
            )}
            data-slot="media-placeholder"
        >
            <GlobeOff className="size-6 text-muted-foreground/50" />
        </div>
    );
}
