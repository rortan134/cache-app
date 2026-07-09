"use client";

import { cn } from "@/lib/common/cn";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";

const DEFAULT_DURATION_SECONDS = 5;
const MAX_SPEED_PX_PER_SECOND = 92;
const MARQUEE_REPEAT_COUNT = 2;

interface TickerTrackStyle extends React.CSSProperties {
    "--animation-distance": string;
    "--duration": string;
}

interface TickerProps extends React.ComponentProps<"span"> {
    direction?: "left" | "right";
}

export function Ticker({
    direction = "left",
    className,
    children,
    ...props
}: TickerProps) {
    const [overflowWidthPx, setOverflowWidthPx] = React.useState(0);

    const trackRef = useStableCallback((el: HTMLSpanElement | null) => {
        if (!el) {
            return;
        }
        const trackWidth = el.offsetWidth;
        const innerEl = el.firstElementChild;
        const contentWidth =
            innerEl instanceof HTMLElement ? innerEl.offsetWidth : 0;
        setOverflowWidthPx(
            contentWidth > 0 && contentWidth > trackWidth ? contentWidth : 0
        );
    });

    const isOverflowing = overflowWidthPx > 0;

    const trackStyle: TickerTrackStyle = {
        "--animation-distance": `${-100 / MARQUEE_REPEAT_COUNT}%`,
        "--duration": `${getTickerDurationSeconds(overflowWidthPx)}s`,
    };

    return (
        <span
            {...props}
            className={cn(
                "group inline-flex w-full min-w-0 overflow-clip",
                className
            )}
            ref={trackRef}
        >
            <span
                className={cn(
                    "flex shrink-0 select-none",
                    isOverflowing &&
                        "paused group-hover:running hover:running animate-marquee",
                    { "direction-reverse": direction === "right" }
                )}
                style={trackStyle}
            >
                {Array.from(
                    { length: isOverflowing ? MARQUEE_REPEAT_COUNT : 1 },
                    (_, index) => (
                        <span className="shrink-0 p-px pr-4" key={index}>
                            {children}
                        </span>
                    )
                )}
            </span>
        </span>
    );
}

function getTickerDurationSeconds(travelDistancePx: number) {
    if (travelDistancePx <= 0 || !Number.isFinite(travelDistancePx)) {
        return DEFAULT_DURATION_SECONDS;
    }
    const cappedDurationSeconds = travelDistancePx / MAX_SPEED_PX_PER_SECOND;
    return Math.max(
        DEFAULT_DURATION_SECONDS,
        Math.ceil(cappedDurationSeconds * 100) / 100
    );
}
