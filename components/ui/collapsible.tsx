"use client";

import { cn } from "@/lib/common/cn";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

export function Collapsible({
    className,
    ...props
}: CollapsiblePrimitive.Root.Props) {
    return (
        <CollapsiblePrimitive.Root
            className={cn("flex flex-col", className)}
            data-slot="collapsible"
            {...props}
        />
    );
}

export function CollapsibleTrigger({
    className,
    ...props
}: CollapsiblePrimitive.Trigger.Props) {
    return (
        <CollapsiblePrimitive.Trigger
            className={cn("group w-full", className)}
            data-slot="collapsible-trigger"
            {...props}
        />
    );
}

export function CollapsiblePanel({
    className,
    ...props
}: CollapsiblePrimitive.Panel.Props) {
    return (
        <CollapsiblePrimitive.Panel
            className={cn(
                "z-0 flex h-(--collapsible-panel-height) flex-col gap-1 overflow-y-clip opacity-100 transition-[height,opacity,translate] data-ending-style:h-0 data-starting-style:h-0 data-ending-style:-translate-y-1 data-starting-style:-translate-y-1.5 data-ending-style:opacity-0 data-starting-style:opacity-0 data-closed:duration-300 data-open:duration-400 data-closed:ease-in-out data-open:ease-[cubic-bezier(0.22,1.18,0.3,1)]",
                className
            )}
            data-slot="collapsible-panel"
            {...props}
        />
    );
}
