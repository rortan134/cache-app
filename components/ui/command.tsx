"use client";

import { cn } from "@/lib/common/cn";
import { Input, type InputSize } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type * as React from "react";

export function Command({
    autoHighlight = "always",
    keepHighlight = true,
    open = true,
    inline = false,
    ...props
}: React.ComponentProps<typeof Autocomplete.Root>) {
    return (
        <Autocomplete.Root
            autoHighlight={autoHighlight}
            inline={inline}
            keepHighlight={keepHighlight}
            open={open}
            {...props}
        />
    );
}

export function CommandInput({
    className,
    startAddon,
    size = "default",
    endAddon,
    ...props
}: Omit<Autocomplete.Input.Props, "size"> & {
    startAddon?: React.ReactNode;
    size?: InputSize;
    ref?: React.Ref<HTMLInputElement>;
    endAddon?: React.ReactNode;
}) {
    return (
        <Autocomplete.InputGroup
            className="group/input relative flex not-has-[>*.w-full]:w-fit w-full text-foreground has-disabled:opacity-64"
            data-slot="command-input-group"
        >
            {startAddon && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-s-px inset-y-0 z-10 flex shrink-0 items-center ps-[calc(--spacing(5)-1px)] has-[+[data-size=sm]]:ps-[calc(--spacing(2.5)-1px)] [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:-mx-0.5"
                    data-slot="command-start-addon"
                >
                    {startAddon}
                </div>
            )}
            <Autocomplete.Input
                className={cn(
                    "min-h-11 rounded-full p-1.5",
                    "border bg-card shadow-xs outline-none ring-0 before:hidden has-focus-visible:border-border has-focus-visible:ring-0 has-focus-visible:ring-offset-0",
                    startAddon &&
                        "data-[size=sm]:*:data-[slot=command-input]:ps-[calc(--spacing(7.5)-1px)] *:data-[slot=command-input]:ps-[calc(--spacing(8.5)-1px)] sm:data-[size=sm]:*:data-[slot=command-input]:ps-[calc(--spacing(7)-1px)] sm:*:data-[slot=command-input]:ps-[calc(--spacing(9)-1px)]",
                    size === "sm"
                        ? "has-[+[data-slot=command-trigger],+[data-slot=command-clear]]:*:data-[slot=command-input]:pe-6.5"
                        : "has-[+[data-slot=command-trigger],+[data-slot=command-clear]]:*:data-[slot=command-input]:pe-7",
                    className
                )}
                data-slot="command-input"
                render={<Input shouldUseNativeInput size={size} />}
                {...props}
            />
            {endAddon && (
                // biome-ignore lint/a11y/useSemanticElements: groups input adornments without naming a form field group.
                <div
                    className="absolute inset-e-0.5 inset-y-0 z-10 flex shrink-0 flex-nowrap items-center justify-end gap-0.5 pe-[calc(--spacing(2)-1px)] has-[+[data-size=sm]]:pe-[calc(--spacing(1.5)-1px)]"
                    role="group"
                >
                    {endAddon}
                </div>
            )}
        </Autocomplete.InputGroup>
    );
}

export function CommandPopup({
    className,
    side = "bottom",
    sideOffset = 4,
    alignOffset,
    align = "start",
    anchor,
    positionMethod,
    portalProps,
    ...props
}: Autocomplete.Popup.Props & {
    align?: Autocomplete.Positioner.Props["align"];
    sideOffset?: Autocomplete.Positioner.Props["sideOffset"];
    alignOffset?: Autocomplete.Positioner.Props["alignOffset"];
    side?: Autocomplete.Positioner.Props["side"];
    anchor?: Autocomplete.Positioner.Props["anchor"];
    positionMethod?: Autocomplete.Positioner.Props["positionMethod"];
    portalProps?: Autocomplete.Portal.Props;
}) {
    return (
        <Autocomplete.Portal {...portalProps}>
            <Autocomplete.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className="z-50 select-none"
                data-slot="command-positioner"
                positionMethod={positionMethod}
                side={side}
                sideOffset={sideOffset}
            >
                <span
                    className={cn(
                        "relative flex max-h-full w-full min-w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) rounded-2xl border bg-popover not-dark:bg-clip-padding shadow-lg/5 transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                >
                    <Autocomplete.Popup
                        className="flex max-h-[min(var(--available-height),32rem)] flex-1 flex-col text-foreground"
                        data-slot="command-popup"
                        {...props}
                    />
                </span>
            </Autocomplete.Positioner>
        </Autocomplete.Portal>
    );
}

export function CommandList({
    className,
    shouldScrollFade = false,
    shouldUseScrollbarGutter = false,
    ...props
}: Autocomplete.List.Props & {
    shouldUseScrollbarGutter?: boolean;
    shouldScrollFade?: boolean;
}) {
    return (
        <ScrollArea
            shouldScrollFade={shouldScrollFade}
            shouldUseScrollbarGutter={shouldUseScrollbarGutter}
        >
            <Autocomplete.List
                className={cn(
                    "not-empty:scroll-py-2 not-empty:p-2 in-data-has-overflow-y:pe-3",
                    className
                )}
                data-slot="command-list"
                {...props}
            />
        </ScrollArea>
    );
}

export function CommandItem({
    className,
    children,
    ...props
}: Autocomplete.Item.Props) {
    return (
        <Autocomplete.Item
            className={cn(
                "flex min-h-8 cursor-default select-none items-center rounded-md px-2 py-1.5 text-base outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm",
                className
            )}
            data-slot="command-item"
            {...props}
        >
            {children}
        </Autocomplete.Item>
    );
}

export function CommandGroup({
    className,
    ...props
}: Autocomplete.Group.Props) {
    return (
        <Autocomplete.Group
            className={cn("[[role=group]+&]:mt-1.5", className)}
            data-slot="command-group"
            {...props}
        />
    );
}

export function CommandGroupLabel({
    className,
    ...props
}: Autocomplete.GroupLabel.Props) {
    return (
        <Autocomplete.GroupLabel
            className={cn(
                "px-2 py-1.5 text-muted-foreground text-xs",
                className
            )}
            data-slot="command-group-label"
            {...props}
        />
    );
}

export function CommandEmpty({
    className,
    ...props
}: Autocomplete.Empty.Props) {
    return (
        <Autocomplete.Empty
            className={cn(
                "not-empty:p-2 not-empty:py-6 text-center text-base text-muted-foreground sm:text-sm",
                className
            )}
            data-slot="command-empty"
            {...props}
        />
    );
}

export function CommandStatus({
    className,
    ...props
}: Autocomplete.Status.Props) {
    return (
        <Autocomplete.Status
            className={cn(
                "px-3 py-2 font-medium text-muted-foreground text-xs empty:m-0 empty:p-0",
                className
            )}
            data-slot="command-status"
            {...props}
        />
    );
}

export function CommandCollection(props: Autocomplete.Collection.Props) {
    return (
        <Autocomplete.Collection {...props} data-slot="command-collection" />
    );
}

export function CommandRow(props: Autocomplete.Row.Props) {
    return <Autocomplete.Row data-slot="command-row" {...props} />;
}

export function CommandPanel({
    className,
    render,
    ...props
}: useRender.ComponentProps<"div">) {
    const defaultProps = {
        className: cn("min-h-0 w-full", className),
        "data-slot": "command-panel",
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

export function CommandShortcut({
    className,
    ...props
}: React.ComponentProps<"kbd">) {
    return (
        <Kbd
            className={cn("ms-auto text-muted-foreground/50", className)}
            data-slot="command-shortcut"
            {...props}
        />
    );
}

export function CommandFooter({
    className,
    render,
    ...props
}: useRender.ComponentProps<"div">) {
    const defaultProps = {
        className: cn(
            "flex items-center justify-end gap-3 rounded-b-[calc(var(--radius-2xl)-1px)] border-border/50 border-t bg-muted/80 px-4 py-2 text-foreground text-xs",
            className
        ),
        "data-slot": "command-footer",
    };

    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
    });
}

export const useCommandFilter: typeof Autocomplete.useFilter =
    Autocomplete.useFilter;
