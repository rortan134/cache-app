"use client";

import { cn } from "@/lib/common/cn";
import * as React from "react";

const DEFAULT_DURATION_SECONDS = 9;
const MAX_SPEED_PX_PER_SECOND = 48;

interface TickerTrackStyle extends React.CSSProperties {
    "--animation-distance": string;
    "--duration": string;
    "--gap": string;
}

interface TickerProps extends React.ComponentProps<"span"> {
    direction?: "left" | "right";
    repeatInstances?: number;
}

export function Ticker({
    direction = "left",
    repeatInstances = 2,
    className,
    children,
    ...props
}: TickerProps) {
    const [trackSizePx, setTrackSizePx] = React.useState(0);

    const track = React.useCallback((el: HTMLSpanElement | null) => {
        if (el) {
            setTrackSizePx((prev) =>
                prev === el.offsetWidth ? prev : el.offsetWidth
            );
        }
    }, []);

    const repeatCount = Math.max(1, Math.ceil(repeatInstances));

    const trackStyle: TickerTrackStyle = {
        "--animation-distance": `${-100 / repeatCount}%`,
        "--duration": `${getTickerDurationSeconds(trackSizePx / repeatCount)}s`,
        "--gap": "1rem",
    };

    return (
        <span
            {...props}
            className={cn(
                "group-hover:running paused flex shrink-0 animate-marquee select-none gap-(--gap)",
                { "direction-reverse": direction === "right" },
                className
            )}
            ref={track}
            style={trackStyle}
        >
            {Array.from({ length: repeatCount }, (_, index) => (
                <span className="shrink-0 p-px" key={index}>
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
