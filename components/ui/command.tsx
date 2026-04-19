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
import { cn } from "@/lib/cn";
import type * as React from "react";

export function Command({
    autoHighlight = "always",
    keepHighlight = true,
    open = true,
    inline = false,
    ...props
}: React.ComponentProps<typeof Autocomplete>): React.ReactElement {
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
}: React.ComponentProps<typeof AutocompleteInput>): React.ReactElement {
    return (
        <AutocompleteInput
            className={cn(
                "min-h-11 border-transparent! shadow-none outline-none ring-0 before:hidden has-focus-visible:ring-0 has-focus-visible:ring-offset-0",
                className
            )}
            {...props}
        />
    );
}

export function CommandList({
    className,
    ...props
}: React.ComponentProps<typeof AutocompleteList>): React.ReactElement {
    return (
        <AutocompleteList
            className={cn("not-empty:scroll-py-2 not-empty:p-2", className)}
            data-slot="command-list"
            {...props}
        />
    );
}

export function CommandEmpty({
    className,
    ...props
}: React.ComponentProps<typeof AutocompleteEmpty>): React.ReactElement {
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
}: React.ComponentProps<"div">): React.ReactElement {
    return (
        <div
            className={cn(
                "sticky top-3 z-30 -mx-px not-has-[+[data-slot=command-footer]]:-mb-px min-h-0 w-full max-w-md",
                className
            )}
            {...props}
        />
    );
}

export function CommandGroup(
    props: React.ComponentProps<typeof AutocompleteGroup>
): React.ReactElement {
    return <AutocompleteGroup data-slot="command-group" {...props} />;
}

export function CommandGroupLabel(
    props: React.ComponentProps<typeof AutocompleteGroupLabel>
): React.ReactElement {
    return (
        <AutocompleteGroupLabel data-slot="command-group-label" {...props} />
    );
}

export function CommandCollection(
    props: React.ComponentProps<typeof AutocompleteCollection>
): React.ReactElement {
    return <AutocompleteCollection data-slot="command-collection" {...props} />;
}

export function CommandItem({
    className,
    ...props
}: React.ComponentProps<typeof AutocompleteItem>): React.ReactElement {
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
}: React.ComponentProps<"kbd">): React.ReactElement {
    return (
        <kbd
            className={cn(
                "ms-auto font-medium font-sans text-muted-foreground/72 text-xs tracking-wider",
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
}: React.ComponentProps<"div">): React.ReactElement {
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
