"use client";

import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/common/cn";
import * as React from "react";

interface DisclosureListProps extends React.ComponentProps<"div"> {
    maxVisible?: number;
}

/**
 * Wraps an array of children and occludes overflow behind a collapsible
 * "Show more" trigger. Use when a long vertical list would otherwise dominate
 * the viewport.
 */
export function DisclosureList({
    maxVisible = 15,
    children,
    className,
    ...props
}: DisclosureListProps) {
    const childrenArray = React.Children.toArray(children);

    if (childrenArray.length === 0) {
        return null;
    }

    const visible = childrenArray.slice(0, maxVisible);
    const hidden = childrenArray.slice(maxVisible);

    return (
        <div
            {...props}
            className={cn("flex flex-col gap-1", className)}
            data-slot="disclosure-list"
        >
            {visible}
            {hidden.length > 0 && <DisclosureListHidden items={hidden} />}
        </div>
    );
}

interface DisclosureListHiddenProps {
    items: React.ReactNode[];
}

function DisclosureListHidden({ items }: DisclosureListHiddenProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Collapsible onOpenChange={setIsOpen} open={isOpen}>
            <CollapsibleTrigger
                className="flex w-full items-center px-2.5 py-1.5 text-muted-foreground text-xs hover:text-foreground"
                title={
                    isOpen
                        ? "Show fewer items"
                        : `Show ${items.length} more items`
                }
            >
                {isOpen ? "Show less" : `Show ${items.length} more`}
            </CollapsibleTrigger>
            <CollapsiblePanel>{items}</CollapsiblePanel>
        </Collapsible>
    );
}
