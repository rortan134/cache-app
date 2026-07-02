"use client";

import { cn } from "@/lib/common/cn";
import * as React from "react";

const DEFAULT_DURATION_SECONDS = 5;
const MAX_SPEED_PX_PER_SECOND = 92;
const REPEAT_COUNT = 2;

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
    const [trackSizePx, setTrackSizePx] = React.useState(0);

    const trackRef = (el: HTMLSpanElement | null) => {
        if (el) {
            setTrackSizePx((prev) =>
                prev === el.offsetWidth ? prev : el.offsetWidth
            );
        }
    };

    const trackStyle: TickerTrackStyle = {
        "--animation-distance": `${-100 / REPEAT_COUNT}%`,
        "--duration": `${getTickerDurationSeconds(trackSizePx / REPEAT_COUNT)}s`,
    };

    return (
        <span
            {...props}
            className={cn(
                "paused group-hover:running hover:running flex shrink-0 animate-marquee select-none",
                { "direction-reverse": direction === "right" },
                className
            )}
            ref={trackRef}
            style={trackStyle}
        >
            {Array.from({ length: REPEAT_COUNT }, (_, index) => (
                <span className="shrink-0 p-px pr-4" key={index}>
                    {children}
                </span>
            ))}
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
