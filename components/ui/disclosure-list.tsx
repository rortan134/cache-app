"use client";

import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/common/cn";
import { Calligraph } from "calligraph";
import * as React from "react";

const MAX_VISIBLE_VERTICAL_DEFAULT = 15;
const MAX_VISIBLE_HORIZONTAL_DEFAULT = 5;

interface DisclosureListHiddenProps
    extends React.ComponentProps<typeof CollapsibleTrigger> {
    items: React.ReactNode[];
}

interface DisclosureListVerticalProps extends React.ComponentProps<"div"> {
    maxVisible?: number;
    triggerProps?: Omit<DisclosureListHiddenProps, "items">;
}

export function DisclosureListVertical({
    maxVisible = MAX_VISIBLE_VERTICAL_DEFAULT,
    children,
    className,
    triggerProps,
    ...props
}: DisclosureListVerticalProps) {
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
            {hidden.length > 0 ? (
                <DisclosureListOverflow {...triggerProps} items={hidden} />
            ) : null}
        </div>
    );
}

interface DisclosureListHorizontalProps extends React.ComponentProps<"div"> {
    badgeRender?: React.ReactElement;
    maxVisible?: number;
}

export function DisclosureListHorizontal({
    maxVisible = MAX_VISIBLE_HORIZONTAL_DEFAULT,
    children,
    className,
    badgeRender,
    ...props
}: DisclosureListHorizontalProps) {
    const childrenArray = React.Children.toArray(children);

    if (childrenArray.length === 0) {
        return null;
    }

    const visible = childrenArray.slice(0, maxVisible);
    const hidden = childrenArray.slice(maxVisible);

    return (
        <div
            {...props}
            className={cn("flex items-center gap-1", className)}
            data-slot="disclosure-list"
        >
            {visible}
            {hidden.length > 0 ? (
                <Popover>
                    <PopoverTrigger render={badgeRender}>
                        +
                        <Calligraph className="-mx-0.5">
                            {hidden.length}
                        </Calligraph>{" "}
                        more
                    </PopoverTrigger>
                    <PopoverPopup>
                        <div className="flex flex-col gap-2">{hidden}</div>
                    </PopoverPopup>
                </Popover>
            ) : null}
        </div>
    );
}

function DisclosureListOverflow({
    items,
    className,
    ...props
}: DisclosureListHiddenProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Collapsible onOpenChange={setIsOpen} open={isOpen}>
            <CollapsibleTrigger
                {...props}
                className={cn(
                    "flex items-center p-1.5 text-muted-foreground text-xs hover:text-foreground",
                    className
                )}
            >
                {isOpen ? "Show less" : `Show ${items.length} more`}
            </CollapsibleTrigger>
            <CollapsiblePanel>{items}</CollapsiblePanel>
        </Collapsible>
    );
}
