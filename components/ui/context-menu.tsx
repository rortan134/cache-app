"use client";

import { cn } from "@/lib/utils";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import type * as React from "react";

export const ContextMenu: typeof ContextMenuPrimitive.Root =
    ContextMenuPrimitive.Root;

export function ContextMenuTrigger(
    props: ContextMenuPrimitive.Trigger.Props,
): React.ReactElement {
    return (
        <ContextMenuPrimitive.Trigger
            data-slot="context-menu-trigger"
            {...props}
        />
    );
}

export function ContextMenuPopup({
    className,
    sideOffset = 0,
    children,
    ...props
}: ContextMenuPrimitive.Popup.Props & {
    sideOffset?: ContextMenuPrimitive.Positioner.Props["sideOffset"];
}): React.ReactElement {
    return (
        <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Positioner
                className="z-50"
                data-slot="context-menu-positioner"
                sideOffset={sideOffset}
            >
                <ContextMenuPrimitive.Popup
                    className={cn(
                        "relative not-[class*='w-']:min-w-52 overflow-hidden origin-(--transform-origin) rounded-2xl border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/8 outline-none transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className,
                    )}
                    data-slot="context-menu-popup"
                    {...props}
                >
                    <div className="max-h-(--available-height) w-full overflow-y-auto p-1">
                        {children}
                    </div>
                </ContextMenuPrimitive.Popup>
            </ContextMenuPrimitive.Positioner>
        </ContextMenuPrimitive.Portal>
    );
}

export function ContextMenuItem({
    className,
    ...props
}: ContextMenuPrimitive.Item.Props): React.ReactElement {
    return (
        <ContextMenuPrimitive.Item
            className={cn(
                "flex cursor-default select-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition-colors data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
                className,
            )}
            data-slot="context-menu-item"
            {...props}
        />
    );
}

export function ContextMenuSeparator({
    className,
    ...props
}: ContextMenuPrimitive.Separator.Props): React.ReactElement {
    return (
        <ContextMenuPrimitive.Separator
            className={cn("my-1 h-px bg-border/70", className)}
            data-slot="context-menu-separator"
            {...props}
        />
    );
}
