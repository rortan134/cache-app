"use client";

import { CheckmarkIcon } from "@/components/ui/icons";
import { Input, type InputSize } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/common/cn";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { XIcon } from "lucide-react";
import * as React from "react";

interface ComboboxContextValue {
    chipsRef: React.RefObject<HTMLDivElement | null> | null;
    multiple: boolean;
}

export const ComboboxContext: React.Context<ComboboxContextValue> =
    React.createContext<ComboboxContextValue>({
        chipsRef: null,
        multiple: false,
    });

export function Combobox<Value, Multiple extends boolean | undefined = false>(
    props: ComboboxPrimitive.Root.Props<Value, Multiple>
) {
    const chipsRef = React.useRef<HTMLDivElement | null>(null);
    return (
        <ComboboxContext value={{ chipsRef, multiple: !!props.multiple }}>
            <ComboboxPrimitive.Root {...props} />
        </ComboboxContext>
    );
}

export function ComboboxChipsInput({
    className,
    size = "default",
    ...props
}: Omit<ComboboxPrimitive.Input.Props, "size"> & {
    size?: InputSize;
    ref?: React.Ref<HTMLInputElement>;
}) {
    return (
        <ComboboxPrimitive.Input
            className={cn(
                "min-w-12 flex-1 text-base outline-none sm:text-sm [[data-slot=combobox-chip]+&]:ps-0.5",
                size === "sm" ? "ps-1.5" : "ps-2",
                className
            )}
            data-size={typeof size === "string" ? size : undefined}
            data-slot="combobox-chips-input"
            size={typeof size === "number" ? size : undefined}
            {...props}
        />
    );
}

export function ComboboxInput({
    className,
    showClear = false,
    startAddon,
    endAddon,
    size = "default",
    clearProps,
    ...props
}: Omit<ComboboxPrimitive.Input.Props, "size"> & {
    showClear?: boolean;
    startAddon?: React.ReactNode;
    endAddon?: React.ReactNode;
    size?: InputSize;
    ref?: React.Ref<HTMLInputElement>;
    clearProps?: ComboboxPrimitive.Clear.Props;
}) {
    return (
        <ComboboxPrimitive.InputGroup
            className="relative not-has-[>*.w-full]:w-fit w-full border-b text-foreground has-disabled:opacity-64"
            data-slot="combobox-input-group"
        >
            {startAddon && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 start-px z-10 flex items-center ps-[calc(--spacing(3)-1px)] opacity-80 has-[+[data-size=sm]]:ps-[calc(--spacing(2.5)-1px)] [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:-mx-0.5"
                    data-slot="combobox-start-addon"
                >
                    {startAddon}
                </div>
            )}
            <ComboboxPrimitive.Input
                className={cn(
                    startAddon &&
                        "data-[size=sm]:*:data-[slot=combobox-input]:ps-[calc(--spacing(7.5)-1px)] *:data-[slot=combobox-input]:ps-[calc(--spacing(8.5)-1px)] sm:data-[size=sm]:*:data-[slot=combobox-input]:ps-[calc(--spacing(7)-1px)] sm:*:data-[slot=combobox-input]:ps-[calc(--spacing(8)-1px)]",
                    endAddon &&
                        "data-[size=sm]:*:data-[slot=combobox-input]:pe-[calc(--spacing(7.5)-1px)] *:data-[slot=combobox-input]:pe-[calc(--spacing(8.5)-1px)] sm:data-[size=sm]:*:data-[slot=combobox-input]:pe-[calc(--spacing(7)-1px)] sm:*:data-[slot=combobox-input]:pe-[calc(--spacing(8)-1px)]",
                    endAddon &&
                        showClear &&
                        "data-[size=sm]:*:data-[slot=combobox-input]:pe-[calc(--spacing(13.5)-1px)] *:data-[slot=combobox-input]:pe-[calc(--spacing(14.5)-1px)] sm:data-[size=sm]:*:data-[slot=combobox-input]:pe-[calc(--spacing(12.5)-1px)] sm:*:data-[slot=combobox-input]:pe-[calc(--spacing(13.5)-1px)]",
                    size === "sm"
                        ? "has-[+[data-slot=combobox-trigger],+[data-slot=combobox-clear]]:*:data-[slot=combobox-input]:pe-6.5"
                        : "has-[+[data-slot=combobox-trigger],+[data-slot=combobox-clear]]:*:data-[slot=combobox-input]:pe-7",
                    "border-none! ring-0!",
                    className
                )}
                data-slot="combobox-input"
                render={
                    <Input
                        className="has-disabled:opacity-100"
                        nativeInput
                        size={size}
                    />
                }
                {...props}
            />
            {endAddon && (
                <div
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none absolute inset-y-0 end-px z-10 flex items-center pe-[calc(--spacing(3)-1px)] opacity-80 has-[+[data-size=sm]]:pe-[calc(--spacing(2.5)-1px)] [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:-mx-0.5",
                        showClear && (size === "sm" ? "inset-e-7" : "end-8.5")
                    )}
                    data-slot="combobox-end-addon"
                >
                    {endAddon}
                </div>
            )}
            {showClear && (
                <ComboboxClear
                    className={cn(
                        "absolute top-1/2 inline-flex size-8 shrink-0 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border border-transparent opacity-80 outline-none transition-opacity pointer-coarse:after:absolute pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:opacity-100 has-[+[data-slot=combobox-clear]]:hidden sm:size-7 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                        size === "sm" ? "inset-e-0" : "inset-e-0.5"
                    )}
                    {...clearProps}
                >
                    <XIcon />
                </ComboboxClear>
            )}
        </ComboboxPrimitive.InputGroup>
    );
}

export function ComboboxTrigger(props: ComboboxPrimitive.Trigger.Props) {
    return (
        <ComboboxPrimitive.Trigger data-slot="combobox-trigger" {...props} />
    );
}

export function ComboboxPopup({
    className,
    children,
    side = "bottom",
    sideOffset = 4,
    alignOffset,
    align = "start",
    anchor: anchorProp,
    positionMethod,
    ...props
}: ComboboxPrimitive.Popup.Props & {
    align?: ComboboxPrimitive.Positioner.Props["align"];
    sideOffset?: ComboboxPrimitive.Positioner.Props["sideOffset"];
    alignOffset?: ComboboxPrimitive.Positioner.Props["alignOffset"];
    side?: ComboboxPrimitive.Positioner.Props["side"];
    anchor?: ComboboxPrimitive.Positioner.Props["anchor"];
    positionMethod?: ComboboxPrimitive.Positioner.Props["positionMethod"];
}) {
    const { chipsRef } = React.use(ComboboxContext);
    const anchor = anchorProp ?? chipsRef;

    return (
        <ComboboxPrimitive.Portal>
            <ComboboxPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className="z-50 select-none"
                data-slot="combobox-positioner"
                positionMethod={positionMethod}
                side={side}
                sideOffset={sideOffset}
            >
                <span
                    className={cn(
                        "relative flex max-h-full min-w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) rounded-lg border bg-popover not-dark:bg-clip-padding shadow-lg/5 transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                >
                    <ComboboxPrimitive.Popup
                        className="flex max-h-[min(var(--available-height),23rem)] flex-1 flex-col text-foreground"
                        data-slot="combobox-popup"
                        {...props}
                    >
                        {children}
                    </ComboboxPrimitive.Popup>
                </span>
            </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
    );
}

export function ComboboxItem({
    className,
    children,
    showIndicatorLast,
    ...props
}: ComboboxPrimitive.Item.Props & {
    showIndicatorLast?: boolean;
}) {
    return (
        <ComboboxPrimitive.Item
            className={cn(
                "grid min-h-8 in-data-[side=none]:min-w-[calc(var(--anchor-width)+1.25rem)] cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-base outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                { "grid-cols-[1fr_1rem]": showIndicatorLast },
                className
            )}
            data-slot="combobox-item"
            {...props}
        >
            {showIndicatorLast && <div className="col-start-1">{children}</div>}
            <ComboboxPrimitive.ItemIndicator
                className={showIndicatorLast ? "col-start-2" : "col-start-1"}
            >
                <CheckmarkIcon className="size-4" />
            </ComboboxPrimitive.ItemIndicator>
            {!showIndicatorLast && (
                <div className="col-start-2">{children}</div>
            )}
        </ComboboxPrimitive.Item>
    );
}

export function ComboboxSeparator({
    className,
    ...props
}: ComboboxPrimitive.Separator.Props) {
    return (
        <ComboboxPrimitive.Separator
            className={cn("mx-2 my-1 h-px bg-border last:hidden", className)}
            data-slot="combobox-separator"
            {...props}
        />
    );
}

export function ComboboxGroup({
    className,
    ...props
}: ComboboxPrimitive.Group.Props) {
    return (
        <ComboboxPrimitive.Group
            className={cn("[[role=group]+&]:mt-1.5", className)}
            data-slot="combobox-group"
            {...props}
        />
    );
}

export function ComboboxGroupLabel({
    className,
    ...props
}: ComboboxPrimitive.GroupLabel.Props) {
    return (
        <ComboboxPrimitive.GroupLabel
            className={cn(
                "px-2 py-1.5 font-medium text-muted-foreground text-xs",
                className
            )}
            data-slot="combobox-group-label"
            {...props}
        />
    );
}

export function ComboboxLabel({
    className,
    ...props
}: ComboboxPrimitive.Label.Props) {
    return (
        <ComboboxPrimitive.Label
            className={cn(
                "inline-flex cursor-default items-center gap-2 font-medium text-base/4.5 text-foreground sm:text-sm/4",
                className
            )}
            data-slot="combobox-label"
            {...props}
        />
    );
}

export function ComboboxEmpty({
    className,
    ...props
}: ComboboxPrimitive.Empty.Props) {
    return (
        <ComboboxPrimitive.Empty
            className={cn(
                "not-empty:p-2 text-center text-muted-foreground text-xs",
                className
            )}
            data-slot="combobox-empty"
            {...props}
        />
    );
}

export function ComboboxRow(props: ComboboxPrimitive.Row.Props) {
    return <ComboboxPrimitive.Row data-slot="combobox-row" {...props} />;
}

export function ComboboxValue(props: ComboboxPrimitive.Value.Props) {
    return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

export function ComboboxList({
    className,
    ...props
}: ComboboxPrimitive.List.Props) {
    return (
        <ScrollArea scrollbarGutter scrollFade>
            <ComboboxPrimitive.List
                className={cn(
                    "not-empty:scroll-py-1 not-empty:px-1 not-empty:py-1 in-data-has-overflow-y:pe-3",
                    className
                )}
                data-slot="combobox-list"
                {...props}
            />
        </ScrollArea>
    );
}

export function ComboboxClear(props: ComboboxPrimitive.Clear.Props) {
    return <ComboboxPrimitive.Clear data-slot="combobox-clear" {...props} />;
}

export function ComboboxStatus({
    className,
    ...props
}: ComboboxPrimitive.Status.Props) {
    return (
        <ComboboxPrimitive.Status
            className={cn(
                "px-3 py-2 font-medium text-muted-foreground text-xs empty:m-0 empty:p-0",
                className
            )}
            data-slot="combobox-status"
            {...props}
        />
    );
}

export function ComboboxCollection(props: ComboboxPrimitive.Collection.Props) {
    return (
        <ComboboxPrimitive.Collection
            data-slot="combobox-collection"
            {...props}
        />
    );
}

export function ComboboxChips({
    className,
    children,
    startAddon,
    ...props
}: ComboboxPrimitive.Chips.Props & {
    startAddon?: React.ReactNode;
}) {
    const { chipsRef } = React.use(ComboboxContext);

    return (
        <ComboboxPrimitive.Chips
            className={cn(
                "relative inline-flex min-h-9 w-full flex-wrap gap-1 rounded-lg border border-input bg-background not-dark:bg-clip-padding p-[calc(--spacing(1)-1px)] text-base shadow-xs/5 outline-none ring-ring/24 transition-shadow *:min-h-7 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-disabled:not-focus-within:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] focus-within:border-ring focus-within:ring-[3px] has-disabled:pointer-events-none has-data-[size=lg]:min-h-10 has-data-[size=sm]:min-h-8 has-aria-invalid:border-destructive/36 has-autofill:bg-foreground/4 has-disabled:opacity-64 has-[:disabled,:focus-within,[aria-invalid]]:shadow-none focus-within:has-aria-invalid:border-destructive/64 focus-within:has-aria-invalid:ring-destructive/16 has-data-[size=lg]:*:min-h-8 has-data-[size=sm]:*:min-h-6 sm:min-h-8 sm:text-sm sm:has-data-[size=lg]:min-h-9 sm:has-data-[size=sm]:min-h-7 sm:*:min-h-6 sm:has-data-[size=lg]:*:min-h-7 sm:has-data-[size=sm]:*:min-h-5 dark:not-has-disabled:bg-input/32 dark:has-autofill:bg-foreground/8 dark:has-aria-invalid:ring-destructive/24 dark:not-has-disabled:not-focus-within:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                className
            )}
            data-slot="combobox-chips"
            ref={chipsRef}
            {...props}
        >
            {startAddon && (
                <div
                    aria-hidden="true"
                    className="flex shrink-0 items-center ps-2 opacity-80 has-[~[data-size=sm]]:has-[+[data-slot=combobox-chip]]:pe-1.5 has-[~[data-size=sm]]:ps-1.5 has-[+[data-slot=combobox-chip]]:pe-2 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:-ms-0.5 [&_svg]:-me-1.5"
                    data-slot="combobox-start-addon"
                >
                    {startAddon}
                </div>
            )}
            {children}
        </ComboboxPrimitive.Chips>
    );
}

export function ComboboxChip({
    children,
    removeProps,
    ...props
}: ComboboxPrimitive.Chip.Props & {
    removeProps?: ComboboxPrimitive.ChipRemove.Props;
}) {
    return (
        <ComboboxPrimitive.Chip
            className="flex items-center rounded-[calc(var(--radius-md)-1px)] bg-accent ps-2 font-medium text-accent-foreground text-sm outline-none sm:text-xs/(--text-xs--line-height) [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3.5"
            data-slot="combobox-chip"
            {...props}
        >
            {children}
            <ComboboxChipRemove {...removeProps} />
        </ComboboxPrimitive.Chip>
    );
}

export function ComboboxChipRemove(props: ComboboxPrimitive.ChipRemove.Props) {
    return (
        <ComboboxPrimitive.ChipRemove
            aria-label="Remove"
            className="h-full shrink-0 cursor-pointer px-1.5 opacity-80 hover:opacity-100 [&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-3.5"
            data-slot="combobox-chip-remove"
            {...props}
        >
            <XIcon />
        </ComboboxPrimitive.ChipRemove>
    );
}

export const useComboboxFilter: typeof ComboboxPrimitive.useFilter =
    ComboboxPrimitive.useFilter;
