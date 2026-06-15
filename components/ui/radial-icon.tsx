import { clamp } from "@/lib/common/numbers";
import type React from "react";

const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_STROKE_WIDTH = 3;

export function RadialIcon({
    value,
    size = 10,
    ...props
}: React.ComponentProps<"svg"> & {
    value: number;
    size?: number;
}) {
    const circumference = 2 * Math.PI * size;
    const dashOffset = circumference * (1 - clamp(value / 100, 0, 1));

    return (
        <svg
            aria-label="Context usage"
            height="20"
            role="img"
            style={{ color: "currentcolor" }}
            viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
            width="20"
            {...props}
        >
            <circle
                cx={ICON_CENTER}
                cy={ICON_CENTER}
                fill="none"
                opacity="0.25"
                r={size}
                stroke="currentColor"
                strokeWidth={ICON_STROKE_WIDTH}
            />
            <circle
                cx={ICON_CENTER}
                cy={ICON_CENTER}
                fill="none"
                r={size}
                stroke="var(--ring)"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth={ICON_STROKE_WIDTH}
                style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "center",
                }}
            />
        </svg>
    );
}
