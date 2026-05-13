"use client";

import { cn } from "@/lib/common/cn";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";

export const MenuCreateHandle: typeof MenuPrimitive.createHandle =
    MenuPrimitive.createHandle;

export const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;

export function MenuTrigger(props: MenuPrimitive.Trigger.Props) {
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
}) {
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

export function MenuGroup(props: MenuPrimitive.Group.Props) {
    return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

export function MenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
    return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />;
}

export function MenuGroupLabel({
    className,
    inset,
    ...props
}: MenuPrimitive.GroupLabel.Props & {
    inset?: boolean;
}) {
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
}: React.ComponentProps<"kbd">) {
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
}) {
    return (
        <MenuPrimitive.Item
            className={cn(
                "flex cursor-default select-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none hover:transition-colors data-disabled:pointer-events-none data-highlighted:bg-accent data-disabled:opacity-50",
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

export function MenuRadioItem({
    className,
    children,
    ...props
}: MenuPrimitive.RadioItem.Props) {
    return (
        <MenuPrimitive.RadioItem
            className={cn(
                "grid min-h-8 cursor-default select-none grid-cols-[1fr_1rem] items-center gap-5 rounded-xl px-2.5 py-1.5 text-sm outline-none hover:transition-colors data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
                className
            )}
            data-slot="menu-radio-item"
            {...props}
        >
            <span className="col-start-1 truncate">{children}</span>
            <MenuPrimitive.RadioItemIndicator className="col-start-2 -me-0.5">
                <CheckIcon className="size-4" />
            </MenuPrimitive.RadioItemIndicator>
        </MenuPrimitive.RadioItem>
    );
}

export function MenuSeparator({
    className,
    ...props
}: MenuPrimitive.Separator.Props) {
    return (
        <MenuPrimitive.Separator
            className={cn("my-0.5 h-px bg-border/50", className)}
            data-slot="menu-separator"
            {...props}
        />
    );
}

export function MenuSub(props: MenuPrimitive.SubmenuRoot.Props) {
    return <MenuPrimitive.SubmenuRoot data-slot="menu-sub" {...props} />;
}

export function MenuSubTrigger({
    children,
    className,
    ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
    return (
        <MenuPrimitive.SubmenuTrigger
            className={cn(
                "flex min-h-8 cursor-default select-none items-center gap-5 rounded-lg px-2.5 py-2 text-sm outline-none hover:transition-colors data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
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
}) {
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

export function MenuCheckboxItem({
    className,
    children,
    checked,
    variant = "default",
    ...props
}: MenuPrimitive.CheckboxItem.Props & {
    variant?: "default" | "switch";
}) {
    return (
        <MenuPrimitive.CheckboxItem
            checked={checked}
            className={cn(
                "grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default items-center gap-2 rounded-sm py-1 ps-2 text-base text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                variant === "switch"
                    ? "grid-cols-[1fr_auto] gap-4 pe-1.5"
                    : "grid-cols-[.75rem_1fr] pe-4",
                className
            )}
            data-slot="menu-checkbox-item"
            {...props}
        >
            {variant === "switch" ? (
                <MenuSwitchIndicator>{children}</MenuSwitchIndicator>
            ) : (
                <MenuCheckIndicator>{children}</MenuCheckIndicator>
            )}
        </MenuPrimitive.CheckboxItem>
    );
}

function MenuSwitchIndicator({ children }: { children: React.ReactNode }) {
    return (
        <>
            <span className="col-start-1">{children}</span>
            <MenuPrimitive.CheckboxItemIndicator
                className="inset-shadow-[0_1px_--theme(--color-black/4%)] inline-flex h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)] shrink-0 items-center rounded-full p-px outline-none transition-[background-color,box-shadow] duration-200 [--thumb-size:--spacing(4)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:bg-primary data-unchecked:bg-input data-disabled:opacity-64 sm:[--thumb-size:--spacing(3)]"
                keepMounted
            >
                <span className="pointer-events-none block aspect-square h-full in-[[data-slot=menu-checkbox-item][data-checked]]:origin-[var(--thumb-size)_50%] origin-left in-[[data-slot=menu-checkbox-item][data-checked]]:translate-x-[calc(var(--thumb-size)-4px)] in-[[data-slot=menu-checkbox-item]:active]:not-data-disabled:scale-x-110 in-[[data-slot=menu-checkbox-item]:active]:rounded-[var(--thumb-size)/calc(var(--thumb-size)*1.10)] rounded-(--thumb-size) bg-background shadow-sm/5 will-change-transform [transition:translate_.15s,border-radius_.15s,scale_.1s_.1s,transform-origin_.15s]" />
            </MenuPrimitive.CheckboxItemIndicator>
        </>
    );
}

function MenuCheckIndicator({ children }: { children: React.ReactNode }) {
    return (
        <>
            <MenuPrimitive.CheckboxItemIndicator className="col-start-1 -ms-0.5">
                <svg
                    aria-hidden="true"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
                </svg>
            </MenuPrimitive.CheckboxItemIndicator>
            <span className="col-start-2">{children}</span>
        </>
    );
}
