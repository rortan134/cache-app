"use client";

import {
    Autocomplete,
    AutocompleteCollection,
    AutocompleteEmpty,
    AutocompleteGroup,
    AutocompleteGroupLabel,
    AutocompleteInput,
    AutocompleteItem,
    AutocompleteList,
} from "@/components/ui/autocomplete";
import { cn } from "@/lib/common/cn";
import type * as React from "react";

export function Command({
    autoHighlight = "always",
    keepHighlight = true,
    open = true,
    inline = false,
    ...props
}: React.ComponentProps<typeof Autocomplete>) {
    return (
        <Autocomplete
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
    ...props
}: React.ComponentProps<typeof AutocompleteInput>) {
    return (
        <AutocompleteInput
            className={cn(
                "border bg-card shadow-xs outline-none ring-0 before:hidden has-focus-visible:border-border has-focus-visible:ring-0 has-focus-visible:ring-offset-0",
                className
            )}
            {...props}
        />
    );
}

export function CommandList({
    className,
    scrollFade = false,
    scrollbarGutter = false,
    ...props
}: React.ComponentProps<typeof AutocompleteList>) {
    return (
        <AutocompleteList
            className={cn("not-empty:scroll-py-2 not-empty:p-2", className)}
            data-slot="command-list"
            scrollbarGutter={scrollbarGutter}
            scrollFade={scrollFade}
            {...props}
        />
    );
}

export function CommandEmpty({
    className,
    ...props
}: React.ComponentProps<typeof AutocompleteEmpty>) {
    return (
        <AutocompleteEmpty
            className={cn("not-empty:py-6", className)}
            data-slot="command-empty"
            {...props}
        />
    );
}

export function CommandPanel({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return <div className={cn("min-h-0 w-full", className)} {...props} />;
}

export function CommandGroup(
    props: React.ComponentProps<typeof AutocompleteGroup>
) {
    return <AutocompleteGroup data-slot="command-group" {...props} />;
}

export function CommandGroupLabel(
    props: React.ComponentProps<typeof AutocompleteGroupLabel>
) {
    return (
        <AutocompleteGroupLabel data-slot="command-group-label" {...props} />
    );
}

export function CommandCollection(
    props: React.ComponentProps<typeof AutocompleteCollection>
) {
    return <AutocompleteCollection data-slot="command-collection" {...props} />;
}

export function CommandItem({
    className,
    ...props
}: React.ComponentProps<typeof AutocompleteItem>) {
    return (
        <AutocompleteItem
            className={cn("py-1.5", className)}
            data-slot="command-item"
            {...props}
        />
    );
}

export function CommandShortcut({
    className,
    ...props
}: React.ComponentProps<"kbd">) {
    return (
        <kbd
            className={cn(
                "ms-auto font-sans text-muted-foreground/50 text-xs tracking-wider",
                className
            )}
            data-slot="command-shortcut"
            {...props}
        />
    );
}

export function CommandFooter({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex items-center justify-end gap-3 rounded-b-[calc(var(--radius-2xl)-1px)] border-border/50 border-t bg-muted/80 px-4 py-2 text-foreground text-xs",
                className
            )}
            data-slot="command-footer"
            {...props}
        />
    );
}
