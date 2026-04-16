"use client";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { CircleX } from "lucide-react";
import type * as React from "react";

export const Autocomplete: typeof AutocompletePrimitive.Root =
    AutocompletePrimitive.Root;

export function AutocompleteInput({
    className,
    startAddon,
    size,
    triggerProps,
    endAddon,
    ...props
}: Omit<AutocompletePrimitive.Input.Props, "size"> & {
    startAddon?: React.ReactNode;
    size?: "sm" | "default" | "lg" | number;
    ref?: React.Ref<HTMLInputElement>;
    triggerProps?: AutocompletePrimitive.Trigger.Props;
    endAddon?: React.ReactNode;
}): React.ReactElement {
    const sizeValue = (size ?? "default") as "sm" | "default" | "lg" | number;

    return (
        <AutocompletePrimitive.InputGroup
            className="relative flex not-has-[>*.w-full]:w-fit w-full text-foreground has-disabled:opacity-64"
            data-slot="autocomplete-input-group"
        >
            {startAddon && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 start-px z-10 flex shrink-0 items-center ps-[calc(--spacing(5)-1px)] has-[+[data-size=sm]]:ps-[calc(--spacing(2.5)-1px)] [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:-mx-0.5"
                    data-slot="autocomplete-start-addon"
                >
                    {startAddon}
                </div>
            )}
            <AutocompletePrimitive.Input
                className={cn(
                    "rounded-full bg-muted px-2 py-1.5",
                    startAddon &&
                        "data-[size=sm]:*:data-[slot=autocomplete-input]:ps-[calc(--spacing(7.5)-1px)] *:data-[slot=autocomplete-input]:ps-[calc(--spacing(8.5)-1px)] sm:data-[size=sm]:*:data-[slot=autocomplete-input]:ps-[calc(--spacing(7)-1px)] sm:*:data-[slot=autocomplete-input]:ps-[calc(--spacing(9)-1px)]",
                    sizeValue === "sm"
                        ? "has-[+[data-slot=autocomplete-trigger],+[data-slot=autocomplete-clear]]:*:data-[slot=autocomplete-input]:pe-6.5"
                        : "has-[+[data-slot=autocomplete-trigger],+[data-slot=autocomplete-clear]]:*:data-[slot=autocomplete-input]:pe-7",
                    className
                )}
                data-slot="autocomplete-input"
                render={<Input nativeInput size={sizeValue} />}
                {...props}
            />
            {endAddon && (
                // biome-ignore lint/a11y/useSemanticElements: Ignore
                <div
                    className="absolute inset-e-0.5 inset-y-0 z-10 flex shrink-0 items-center justify-end gap-0.5 pe-[calc(--spacing(2)-1px)] has-[+[data-size=sm]]:pe-[calc(--spacing(1.5)-1px)]"
                    role="group"
                >
                    {endAddon}
                </div>
            )}
        </AutocompletePrimitive.InputGroup>
    );
}

export function AutocompletePopup({
    className,
    side = "bottom",
    sideOffset = 4,
    alignOffset,
    align = "start",
    anchor,
    positionMethod,
    portalProps,
    ...props
}: AutocompletePrimitive.Popup.Props & {
    align?: AutocompletePrimitive.Positioner.Props["align"];
    sideOffset?: AutocompletePrimitive.Positioner.Props["sideOffset"];
    alignOffset?: AutocompletePrimitive.Positioner.Props["alignOffset"];
    side?: AutocompletePrimitive.Positioner.Props["side"];
    anchor?: AutocompletePrimitive.Positioner.Props["anchor"];
    positionMethod?: AutocompletePrimitive.Positioner.Props["positionMethod"];
    portalProps?: AutocompletePrimitive.Portal.Props;
}): React.ReactElement {
    return (
        <AutocompletePrimitive.Portal {...portalProps}>
            <AutocompletePrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className="z-50 select-none"
                data-slot="autocomplete-positioner"
                positionMethod={positionMethod}
                side={side}
                sideOffset={sideOffset}
            >
                <span
                    className={cn(
                        "relative flex max-h-full w-full min-w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) rounded-2xl border bg-popover not-dark:bg-clip-padding shadow-lg/5 transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                >
                    <AutocompletePrimitive.Popup
                        className="flex max-h-[min(var(--available-height),23rem)] flex-1 flex-col text-foreground"
                        data-slot="autocomplete-popup"
                        {...props}
                    />
                </span>
            </AutocompletePrimitive.Positioner>
        </AutocompletePrimitive.Portal>
    );
}

export function AutocompleteItem({
    className,
    children,
    ...props
}: AutocompletePrimitive.Item.Props): React.ReactElement {
    return (
        <AutocompletePrimitive.Item
            className={cn(
                "flex min-h-8 cursor-default select-none items-center rounded-md px-2 py-1 text-base outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm",
                className
            )}
            data-slot="autocomplete-item"
            {...props}
        >
            {children}
        </AutocompletePrimitive.Item>
    );
}

export function AutocompleteSeparator({
    className,
    ...props
}: AutocompletePrimitive.Separator.Props): React.ReactElement {
    return (
        <AutocompletePrimitive.Separator
            className={cn("mx-2 my-1 h-px bg-border last:hidden", className)}
            data-slot="autocomplete-separator"
            {...props}
        />
    );
}

export function AutocompleteGroup({
    className,
    ...props
}: AutocompletePrimitive.Group.Props): React.ReactElement {
    return (
        <AutocompletePrimitive.Group
            className={cn("[[role=group]+&]:mt-1.5", className)}
            data-slot="autocomplete-group"
            {...props}
        />
    );
}

export function AutocompleteGroupLabel({
    className,
    ...props
}: AutocompletePrimitive.GroupLabel.Props): React.ReactElement {
    return (
        <AutocompletePrimitive.GroupLabel
            className={cn(
                "px-2 py-1.5 font-medium text-muted-foreground text-xs",
                className
            )}
            data-slot="autocomplete-group-label"
            {...props}
        />
    );
}

export function AutocompleteEmpty({
    className,
    ...props
}: AutocompletePrimitive.Empty.Props): React.ReactElement {
    return (
        <AutocompletePrimitive.Empty
            className={cn(
                "not-empty:p-2 text-center text-base text-muted-foreground sm:text-sm",
                className
            )}
            data-slot="autocomplete-empty"
            {...props}
        />
    );
}

export function AutocompleteRow(
    props: AutocompletePrimitive.Row.Props
): React.ReactElement {
    return (
        <AutocompletePrimitive.Row data-slot="autocomplete-row" {...props} />
    );
}

export function AutocompleteValue(
    props: AutocompletePrimitive.Value.Props
): React.ReactElement {
    return (
        <AutocompletePrimitive.Value
            data-slot="autocomplete-value"
            {...props}
        />
    );
}

export function AutocompleteList({
    className,
    ...props
}: AutocompletePrimitive.List.Props): React.ReactElement {
    return (
        <ScrollArea scrollbarGutter scrollFade>
            <AutocompletePrimitive.List
                className={cn(
                    "not-empty:scroll-py-1 not-empty:p-1 in-data-has-overflow-y:pe-3",
                    className
                )}
                data-slot="autocomplete-list"
                {...props}
            />
        </ScrollArea>
    );
}

export function AutocompleteClear({
    className,
    ...props
}: AutocompletePrimitive.Clear.Props): React.ReactElement {
    return (
        <AutocompletePrimitive.Clear
            className={cn(
                "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center outline-none transition-[color,background-color,box-shadow,opacity] pointer-coarse:after:absolute pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:opacity-100 sm:size-7 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                className
            )}
            data-slot="autocomplete-clear"
            {...props}
        >
            <CircleX className="size-4" />
        </AutocompletePrimitive.Clear>
    );
}

export function AutocompleteStatus({
    className,
    ...props
}: AutocompletePrimitive.Status.Props): React.ReactElement {
    return (
        <AutocompletePrimitive.Status
            className={cn(
                "px-3 py-2 font-medium text-muted-foreground text-xs empty:m-0 empty:p-0",
                className
            )}
            data-slot="autocomplete-status"
            {...props}
        />
    );
}

export function AutocompleteCollection(
    props: AutocompletePrimitive.Collection.Props
): React.ReactElement {
    return (
        <AutocompletePrimitive.Collection
            data-slot="autocomplete-collection"
            {...props}
        />
    );
}

export function AutocompleteTrigger(
    props: AutocompletePrimitive.Trigger.Props
): React.ReactElement {
    return (
        <AutocompletePrimitive.Trigger
            data-slot="autocomplete-trigger"
            {...props}
        />
    );
}

export const useAutocompleteFilter: typeof AutocompletePrimitive.useFilter =
    AutocompletePrimitive.useFilter;
