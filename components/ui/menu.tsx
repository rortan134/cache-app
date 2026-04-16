"use client";

import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";

export const MenuCreateHandle: typeof MenuPrimitive.createHandle =
    MenuPrimitive.createHandle;

export const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;

export function MenuTrigger(
    props: MenuPrimitive.Trigger.Props
): React.ReactElement {
    return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

export function MenuPopup({
    children,
    className,
    sideOffset = 4,
    align = "center",
    alignOffset,
    side = "bottom",
    anchor,
    portalProps,
    ...props
}: MenuPrimitive.Popup.Props & {
    align?: MenuPrimitive.Positioner.Props["align"];
    sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
    alignOffset?: MenuPrimitive.Positioner.Props["alignOffset"];
    side?: MenuPrimitive.Positioner.Props["side"];
    anchor?: MenuPrimitive.Positioner.Props["anchor"];
    portalProps?: MenuPrimitive.Portal.Props;
}): React.ReactElement {
    return (
        <MenuPrimitive.Portal {...portalProps}>
            <MenuPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className="z-50"
                data-slot="menu-positioner"
                side={side}
                sideOffset={sideOffset}
            >
                <MenuPrimitive.Popup
                    className={cn(
                        "relative not-[class*='w-']:min-w-52 origin-(--transform-origin) overflow-hidden rounded-2xl border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/8 outline-none transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                    data-slot="menu-popup"
                    {...props}
                >
                    <div className="max-h-(--available-height) w-full overflow-y-auto p-1">
                        {children}
                    </div>
                </MenuPrimitive.Popup>
            </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
    );
}

export function MenuGroup(
    props: MenuPrimitive.Group.Props
): React.ReactElement {
    return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

export function MenuGroupLabel({
    className,
    inset,
    ...props
}: MenuPrimitive.GroupLabel.Props & {
    inset?: boolean;
}): React.ReactElement {
    return (
        <MenuPrimitive.GroupLabel
            className={cn(
                "px-2 py-1.5 font-medium text-muted-foreground text-xs data-inset:ps-9 sm:data-inset:ps-8",
                className
            )}
            data-inset={inset}
            data-slot="menu-label"
            {...props}
        />
    );
}

export function MenuShortcut({
    className,
    ...props
}: React.ComponentProps<"kbd">): React.ReactElement {
    return (
        <kbd
            className={cn(
                "ms-auto font-medium font-sans text-muted-foreground/72 text-xs tracking-widest",
                className
            )}
            data-slot="menu-shortcut"
            {...props}
        />
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
                "flex cursor-default select-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none transition-colors data-disabled:pointer-events-none data-highlighted:bg-accent data-disabled:opacity-50",
                variant === "default" &&
                    "data-highlighted:text-accent-foreground",
                variant === "destructive" &&
                    "text-destructive-foreground data-highlighted:bg-destructive/8 data-highlighted:text-destructive-foreground",
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
            className={cn("my-0.5 h-px bg-border/50", className)}
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
                "flex min-h-8 cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
                className
            )}
            data-slot="menu-sub-trigger"
            {...props}
        >
            {children}
            <ChevronRightIcon className="ms-auto -me-0.5 size-4 opacity-80" />
        </MenuPrimitive.SubmenuTrigger>
    );
}

export function MenuSubPopup({
    className,
    sideOffset = 0,
    alignOffset,
    align = "start",
    ...props
}: MenuPrimitive.Popup.Props & {
    align?: MenuPrimitive.Positioner.Props["align"];
    sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
    alignOffset?: MenuPrimitive.Positioner.Props["alignOffset"];
}): React.ReactElement {
    const defaultAlignOffset = align === "center" ? undefined : -5;

    return (
        <MenuPopup
            align={align}
            alignOffset={alignOffset ?? defaultAlignOffset}
            className={className}
            data-slot="menu-sub-content"
            side="inline-end"
            sideOffset={sideOffset}
            {...props}
        />
    );
}
