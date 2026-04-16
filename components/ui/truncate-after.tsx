"use client";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import * as React from "react";

interface TruncateAfterProps {
    children: React.ReactNode;
    className?: string;
    count?: number;
}

const TruncateAfter = ({
    count = 5,
    children,
    className,
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

    const numTruncated = remaining.length;

    return (
        <div className={cn("flex flex-wrap items-center gap-1", className)}>
            {displayed}
            {numTruncated > 0 && (
                <Popover>
                    <PopoverTrigger
                        render={
                            <Badge
                                className="cursor-pointer tabular-nums"
                                render={<button type="button" />}
                                variant="outline"
                            />
                        }
                    >
                        +{numTruncated}
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
