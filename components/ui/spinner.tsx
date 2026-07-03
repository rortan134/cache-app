import { cn } from "@/lib/common/cn";
import { Loader2Icon } from "lucide-react";
import type * as React from "react";

export function Spinner({
    className,
    ...props
}: React.ComponentProps<typeof Loader2Icon>) {
    return (
        <Loader2Icon
            {...props}
            aria-label="Loading"
            className={cn("animate-spin", className)}
            data-slot="spinner"
            role="status"
        />
    );
}
