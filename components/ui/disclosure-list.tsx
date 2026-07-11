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

interface DisclosureListVerticalProps extends React.ComponentProps<"div"> {
    maxVisible?: number;
}

const MAX_VISIBLE_VERTICAL_DEFAULT = 15;

export function DisclosureListVertical({
    maxVisible = MAX_VISIBLE_VERTICAL_DEFAULT,
    children,
    className,
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
            {hidden.length > 0 ? <DisclosureListHidden items={hidden} /> : null}
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
                title={isOpen ? "Show less" : `Show ${items.length} more`}
            >
                {isOpen ? "Show less" : `Show ${items.length} more`}
            </CollapsibleTrigger>
            <CollapsiblePanel>{items}</CollapsiblePanel>
        </Collapsible>
    );
}

interface DisclosureListHorizontalProps extends React.ComponentProps<"div"> {
    badgeRender?: React.ReactElement;
    maxVisible?: number;
}

const MAX_VISIBLE_HORIZONTAL_DEFAULT = 5;

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
