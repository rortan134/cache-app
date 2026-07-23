"use client";

import { cn } from "@/lib/common/cn";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";

export const ContextMenu: typeof ContextMenuPrimitive.Root =
    ContextMenuPrimitive.Root;

export function ContextMenuTrigger(props: ContextMenuPrimitive.Trigger.Props) {
    return (
        <ContextMenuPrimitive.Trigger
            {...props}
            data-slot="context-menu-trigger"
        />
    );
}

export function ContextMenuPopup({
    className,
    sideOffset = 0,
    align = "start",
    alignOffset,
    anchor,
    positionMethod,
    portalProps,
    children,
    ...props
}: ContextMenuPrimitive.Popup.Props & {
    sideOffset?: ContextMenuPrimitive.Positioner.Props["sideOffset"];
    align?: ContextMenuPrimitive.Positioner.Props["align"];
    alignOffset?: ContextMenuPrimitive.Positioner.Props["alignOffset"];
    anchor?: ContextMenuPrimitive.Positioner.Props["anchor"];
    positionMethod?: ContextMenuPrimitive.Positioner.Props["positionMethod"];
    portalProps?: ContextMenuPrimitive.Portal.Props;
}) {
    return (
        <ContextMenuPrimitive.Portal {...portalProps}>
            <ContextMenuPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className="z-50"
                data-slot="context-menu-positioner"
                positionMethod={positionMethod}
                sideOffset={sideOffset}
            >
                <ContextMenuPrimitive.Popup
                    {...props}
                    className={cn(
                        "relative not-[class*='w-']:min-w-52 origin-(--transform-origin) overflow-hidden rounded-2xl border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/8 outline-none transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                    data-slot="context-menu-popup"
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
}: ContextMenuPrimitive.Item.Props) {
    return (
        <ContextMenuPrimitive.Item
            {...props}
            className={cn(
                "flex cursor-default select-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition-colors data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64",
                className
            )}
            data-slot="context-menu-item"
        />
    );
}

export function ContextMenuSeparator({
    className,
    ...props
}: ContextMenuPrimitive.Separator.Props) {
    return (
        <ContextMenuPrimitive.Separator
            {...props}
            className={cn("my-1 h-px bg-border/50", className)}
            data-slot="context-menu-separator"
        />
    );
}
