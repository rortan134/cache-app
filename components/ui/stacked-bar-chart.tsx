"use client";

import { cn } from "@/lib/common/cn";
import { formatPercent } from "@/lib/common/numbers";
import type * as React from "react";

export interface StackedBarChartSegment {
    color: string;
    key: string;
    label: string;
    value: number;
}

export function StackedBarChart({
    className,
    segments,
    ...props
}: StackedBarChartProps) {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    const visibleSegments = segments.filter((segment) => segment.value > 0);

    if (visibleSegments.length === 0) {
        return (
            <div
                {...props}
                aria-hidden
                className={cn(
                    "h-2 w-full overflow-hidden rounded-full bg-muted",
                    className
                )}
                data-slot="stacked-bar-chart"
            />
        );
    }

    return (
        <div
            {...props}
            aria-label={buildStackedBarAriaLabel(visibleSegments, total)}
            className={cn(
                "flex h-2 w-full overflow-hidden rounded-full bg-muted",
                className
            )}
            data-slot="stacked-bar-chart"
            role="img"
        >
            {visibleSegments.map((segment, index) => {
                const widthPercent = (segment.value / total) * 100;
                const isFirst = index === 0;
                const isLast = index === visibleSegments.length - 1;

                return (
                    <div
                        className={cn(
                            "min-w-0 transition-[flex-grow]",
                            isFirst && "rounded-s-full",
                            isLast && "rounded-e-full"
                        )}
                        key={segment.key}
                        style={{
                            backgroundColor: segment.color,
                            flexBasis: 0,
                            flexGrow: segment.value,
                        }}
                        title={`${segment.label}: ${segment.value} (${formatPercent(widthPercent)})`}
                    />
                );
            })}
        </div>
    );
}

export interface StackedBarChartProps extends React.ComponentProps<"div"> {
    segments: readonly StackedBarChartSegment[];
}

function buildStackedBarAriaLabel(
    segments: readonly StackedBarChartSegment[],
    total: number
): string {
    return segments
        .map((segment) => {
            const percent = formatPercent((segment.value / total) * 100);
            return `${segment.label} ${segment.value} (${percent})`;
        })
        .join(", ");
}
