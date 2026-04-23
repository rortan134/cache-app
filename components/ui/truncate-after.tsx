"use client";

import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { clamp } from "@/lib/common/clamp";
import { cn } from "@/lib/common/cn";
import * as React from "react";

interface TruncateAfterProps extends React.ComponentProps<"div"> {
    badgeRender?: React.ReactElement;
    count?: number;
}

const TruncateAfter = ({
    count = 5,
    children,
    className,
    badgeRender,
    ...props
}: TruncateAfterProps) => {
    const elementCount = React.Children.count(children);

    if (elementCount === 0) {
        return null;
    }

    const displayed: React.ReactNode[] = [];
    const remaining: React.ReactNode[] = [];

    React.Children.map(children, (child, index) => {
        if (index < count) {
            displayed.push(child);
        } else {
            remaining.push(child);
        }
    });

    const numTruncated = clamp(remaining.length, 0, 99);

    return (
        <div className={cn("flex items-center gap-1", className)} {...props}>
            {displayed}
            {numTruncated > 0 && (
                <Popover>
                    <PopoverTrigger render={badgeRender}>
                        +{numTruncated} more
                    </PopoverTrigger>
                    <PopoverPopup>
                        <div className="flex flex-col gap-2">{remaining}</div>
                    </PopoverPopup>
                </Popover>
            )}
        </div>
    );
};

export { TruncateAfter };
