"use client";

import { cn } from "@/lib/common/cn";
import { useClientOnlyValue } from "@/components/ui/client-only";
import {
    getSystemAltKey,
    getSystemControlKey,
    getSystemShiftKey,
} from "@/lib/common/keyboard";
import type * as React from "react";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
    return (
        <kbd
            {...props}
            className={cn(
                "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 text-nowrap rounded-full bg-card/50 px-1.5 font-medium font-sans text-muted-foreground text-xs uppercase [&_svg:not([class*='size-'])]:size-3",
                className
            )}
            data-slot="kbd"
        />
    );
}

export function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
    return (
        <kbd
            {...props}
            className={cn("inline-flex items-center gap-0.5", className)}
            data-slot="kbd-group"
        />
    );
}

export function CmdKbd() {
    return useClientOnlyValue(getSystemControlKey());
}

export function AltKbd() {
    return useClientOnlyValue(getSystemAltKey());
}

export function ShiftKbd() {
    return useClientOnlyValue(getSystemShiftKey());
}
