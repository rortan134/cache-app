"use client";

import { cn } from "@/lib/common/cn";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import * as React from "react";

const DEFAULT_DURATION_SECONDS = 5;
const MAX_SPEED_PX_PER_SECOND = 92;
const MARQUEE_REPEAT_COUNT = 2;

interface TickerMeasurements {
    childPx: number;
    trackPx: number;
}

interface TickerTrackStyle extends React.CSSProperties {
    "--animation-distance": string;
    "--duration": string;
}

interface TickerProps extends React.ComponentProps<"span"> {
    direction?: "left" | "right";
}

const INITIAL_MEASUREMENTS: TickerMeasurements = { childPx: 0, trackPx: 0 };

export function Ticker({
    direction = "left",
    className,
    children,
    ...props
}: TickerProps) {
    const trackRef = React.useRef<HTMLSpanElement | null>(null);
    const childRef = React.useRef<HTMLSpanElement | null>(null);
    const [measurements, setMeasurements] =
        React.useState<TickerMeasurements>(INITIAL_MEASUREMENTS);

    useIsoLayoutEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }
        const trackPx = track.offsetWidth;
        const childPx = childRef.current?.offsetWidth ?? 0;
        setMeasurements((current) =>
            current.trackPx === trackPx && current.childPx === childPx
                ? current
                : { childPx, trackPx }
        );
    }, [children]);

    const isOverflowing =
        measurements.childPx > 0 && measurements.childPx > measurements.trackPx;

    const renderedRepeatCount = isOverflowing ? MARQUEE_REPEAT_COUNT : 1;

    const trackStyle: TickerTrackStyle = {
        "--animation-distance": `${-100 / MARQUEE_REPEAT_COUNT}%`,
        "--duration": `${getTickerDurationSeconds(measurements.childPx)}s`,
    };

    return (
        <span
            {...props}
            className={cn("group block w-full min-w-0", className)}
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
                {Array.from({ length: renderedRepeatCount }, (_, index) => (
                    <span
                        className={cn("shrink-0 p-px", isOverflowing && "pr-4")}
                        key={index}
                        ref={index === 0 ? childRef : undefined}
                    >
                        {children}
                    </span>
                ))}
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
