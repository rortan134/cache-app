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
    AutocompleteSeparator,
} from "@/components/ui/autocomplete";
import { cn } from "@/lib/utils";
import type * as React from "react";

export function Command({
    autoHighlight = "always",
    keepHighlight = true,
    ...props
}: React.ComponentProps<typeof Autocomplete>): React.ReactElement {
    return (
        <Autocomplete
            autoHighlight={autoHighlight}
            inline
            keepHighlight={keepHighlight}
            open
            {...props}
        />
    );
}

export function CommandInput({
    className,
    placeholder = undefined,
    startAddon,
    trailing,
    ...props
}: React.ComponentProps<typeof AutocompleteInput> & {
    /** Renders after the field (e.g. chips + clear). Enables a horizontal flex layout. */
    readonly trailing?: React.ReactNode;
}): React.ReactElement {
    const field = (
        <AutocompleteInput
            className={cn(
                "border-transparent! rounded-none bg-transparent! outline-none ring-0 shadow-none before:hidden has-focus-visible:ring-0 has-focus-visible:ring-offset-0",
                className,
            )}
            placeholder={placeholder}
            size="lg"
            startAddon={startAddon}
            {...props}
        />
    );

    if (trailing) {
        return (
            <div
                className={cn(
                    "flex min-w-0 items-center gap-1.5",
                    "min-h-11 w-full max-w-md rounded-full bg-muted px-2 py-1.5 ring-1 ring-border/40 shadow-[0_0_0_rgba(15,23,42,0)] transition-[box-shadow,background-color] has-focus-within:bg-background/96 has-focus-within:shadow-[0_10px_30px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.24)_inset] dark:ring-border/50 dark:shadow-[0_0_0_rgba(0,0,0,0)] dark:has-focus-within:shadow-[0_12px_32px_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.05)_inset]",
                )}
            >
                <div className="min-w-0 flex-1" data-library-command-field="">
                    {field}
                </div>
                <div
                    className="flex shrink-0 flex-wrap items-center justify-end gap-1"
                    data-library-palette-trailing=""
                >
                    {trailing}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "px-2.5 py-1.5",
                "min-h-11 w-full max-w-md rounded-full bg-muted px-2 py-1.5 ring-1 ring-border/40 shadow-[0_0_0_rgba(15,23,42,0)] transition-[box-shadow,background-color] has-focus-within:bg-background/96 has-focus-within:shadow-[0_10px_30px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.24)_inset] dark:ring-border/50 dark:shadow-[0_0_0_rgba(0,0,0,0)] dark:has-focus-within:shadow-[0_12px_32px_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.05)_inset]",
            )}
            data-library-command-field=""
        >
            {field}
        </div>
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
    unstyled = false,
    ...props
}: React.ComponentProps<"div"> & {
    /**
     * When true, skips popover shell (border, shadow, bg-popover) for inline
     * page-embedded command fields.
     */
    readonly unstyled?: boolean;
}): React.ReactElement {
    return (
        <div
            className={cn(
                !unstyled &&
                    "relative -mx-px not-has-[+[data-slot=command-footer]]:-mb-px min-h-0 rounded-t-xl not-has-[+[data-slot=command-footer]]:rounded-b-2xl border border-b-0 bg-popover bg-clip-padding shadow-xs/5 [clip-path:inset(0_1px)] not-has-[+[data-slot=command-footer]]:[clip-path:inset(0_1px_1px_1px_round_0_0_calc(var(--radius-2xl)-1px)_calc(var(--radius-2xl)-1px))] before:pointer-events-none before:absolute before:inset-0 before:rounded-t-[calc(var(--radius-xl)-1px)] **:data-[slot=scroll-area-scrollbar]:mt-2",
                unstyled &&
                    "sticky top-3 z-20 max-w-md min-h-0 w-full border-0 bg-transparent p-0 shadow-none before:hidden",
                className,
            )}
            {...props}
        />
    );
}

export function CommandGroup(
    props: React.ComponentProps<typeof AutocompleteGroup>,
): React.ReactElement {
    return <AutocompleteGroup data-slot="command-group" {...props} />;
}

export function CommandGroupLabel(
    props: React.ComponentProps<typeof AutocompleteGroupLabel>,
): React.ReactElement {
    return (
        <AutocompleteGroupLabel data-slot="command-group-label" {...props} />
    );
}

export function CommandCollection(
    props: React.ComponentProps<typeof AutocompleteCollection>,
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

export function CommandSeparator({
    className,
    ...props
}: React.ComponentProps<typeof AutocompleteSeparator>): React.ReactElement {
    return (
        <AutocompleteSeparator
            className={cn("my-2", className)}
            data-slot="command-separator"
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
                className,
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
                "flex items-center justify-between gap-2 rounded-b-[calc(var(--radius-2xl)-1px)] border-t px-5 py-3 text-muted-foreground text-xs",
                className,
            )}
            data-slot="command-footer"
            {...props}
        />
    );
}
