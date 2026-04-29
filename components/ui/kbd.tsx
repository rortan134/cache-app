"use client";

import { useClientOnlyValue } from "@/components/ui/client-only";
import { cn } from "@/lib/common/cn";
import { getSystemControlKey } from "@/lib/common/environment";
import type * as React from "react";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
    return (
        <kbd
            className={cn(
                "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded-full border border-border/50 bg-card/50 px-1.5 font-medium font-sans text-muted-foreground text-xs [&_svg:not([class*='size-'])]:size-3",
                className
            )}
            data-slot="kbd"
            {...props}
        />
    );
}

export function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
    return (
        <kbd
            className={cn("inline-flex items-center gap-0.5", className)}
            data-slot="kbd-group"
            {...props}
        />
    );
}

export function CtrlKbd() {
    const modKey = useClientOnlyValue(getSystemControlKey());
    return modKey;
}
