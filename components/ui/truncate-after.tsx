"use client";

import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/common/cn";
import { clamp } from "@/lib/common/numbers";
import { Calligraph } from "calligraph";
import * as React from "react";

interface TruncateAfterProps extends React.ComponentProps<"div"> {
    badgeRender?: React.ReactElement;
    maxVisible?: number;
}

export function TruncateAfter({
    maxVisible = 5,
    children,
    className,
    badgeRender,
    ...props
}: TruncateAfterProps) {
    const childrenArray = React.Children.toArray(children);

    if (childrenArray.length === 0) {
        return null;
    }

    const displayed = childrenArray.slice(0, maxVisible);
    const remaining = childrenArray.slice(maxVisible);
    const numTruncated = clamp(remaining.length, 0, 99);

    return (
        <div className={cn("flex items-center gap-1", className)} {...props}>
            {displayed}
            {numTruncated > 0 && (
                <Popover>
                    <PopoverTrigger render={badgeRender}>
                        +<Calligraph>{numTruncated}</Calligraph> more
                    </PopoverTrigger>
                    <PopoverPopup>
                        <div className="flex flex-col gap-2">{remaining}</div>
                    </PopoverPopup>
                </Popover>
            )}
        </div>
    );
}
