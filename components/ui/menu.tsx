"use client";

import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";

export const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;

export function MenuTrigger(
    props: MenuPrimitive.Trigger.Props
): React.ReactElement {
    return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

export function MenuPortal(
    props: MenuPrimitive.Portal.Props
): React.ReactElement {
    return <MenuPrimitive.Portal data-slot="menu-portal" {...props} />;
}

export function MenuPopup({
    align = "end",
    className,
    sideOffset = 6,
    side,
    ...props
}: MenuPrimitive.Popup.Props & {
    align?: MenuPrimitive.Positioner.Props["align"];
    sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
    side?: MenuPrimitive.Positioner.Props["side"];
}): React.ReactElement {
    return (
        <MenuPortal>
            <MenuPrimitive.Positioner
                align={align}
                className="z-50 max-w-(--available-width)"
                data-slot="menu-positioner"
                side={side}
                sideOffset={sideOffset}
            >
                <MenuPrimitive.Popup
                    className={cn(
                        "relative min-w-52 overflow-hidden rounded-xl border bg-popover not-dark:bg-clip-padding p-1 text-popover-foreground shadow-lg/8 outline-none transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                    data-slot="menu-popup"
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPortal>
    );
}

export function MenuItem({
    className,
    variant = "default",
    ...props
}: MenuPrimitive.Item.Props & {
    variant?: "default" | "destructive";
}): React.ReactElement {
    return (
        <MenuPrimitive.Item
            className={cn(
                "flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[disabled]:opacity-50",
                variant === "default" &&
                    "data-[highlighted]:text-accent-foreground",
                variant === "destructive" &&
                    "text-destructive-foreground data-[highlighted]:bg-destructive/8 data-[highlighted]:text-destructive-foreground",
                className
            )}
            data-slot="menu-item"
            {...props}
        />
    );
}

export function MenuSeparator({
    className,
    ...props
}: MenuPrimitive.Separator.Props): React.ReactElement {
    return (
        <MenuPrimitive.Separator
            className={cn("my-1 h-px bg-border/70", className)}
            data-slot="menu-separator"
            {...props}
        />
    );
}

export function MenuSub(
    props: MenuPrimitive.SubmenuRoot.Props
): React.ReactElement {
    return <MenuPrimitive.SubmenuRoot data-slot="menu-sub" {...props} />;
}

export function MenuSubTrigger({
    children,
    className,
    ...props
}: MenuPrimitive.SubmenuTrigger.Props): React.ReactElement {
    return (
        <MenuPrimitive.SubmenuTrigger
            className={cn(
                "flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50",
                className
            )}
            data-slot="menu-sub-trigger"
            {...props}
        >
            <span className="min-w-0 flex-1 truncate">{children}</span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
        </MenuPrimitive.SubmenuTrigger>
    );
}

export function MenuSubPopup({
    className,
    sideOffset = 6,
    ...props
}: MenuPrimitive.Popup.Props & {
    sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
}): React.ReactElement {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
                className="z-50 max-w-(--available-width)"
                data-slot="menu-sub-positioner"
                sideOffset={sideOffset}
            >
                <MenuPrimitive.Popup
                    className={cn(
                        "relative min-w-52 overflow-hidden rounded-xl border bg-popover not-dark:bg-clip-padding p-1 text-popover-foreground shadow-lg/8 outline-none transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                    data-slot="menu-sub-popup"
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
    );
}
