"use client";

import { useGT } from "gt-next";
import type * as React from "react";
import { clamp } from "@/lib/common/numbers";

const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_STROKE_WIDTH = 3;

interface RadialIconProps extends React.ComponentProps<"svg"> {
    size?: number;
    value: number;
}

export function RadialIcon({
    value,
    size = 10,
    "aria-label": ariaLabel,
    "aria-hidden": ariaHidden,
    role = "img",
    ...props
}: RadialIconProps) {
    const gt = useGT();
    const circumference = 2 * Math.PI * size;
    const dashOffset = circumference * (1 - clamp(value / 100, 0, 1));
    const isDecorative = ariaHidden === true || ariaHidden === "true";
    const label = ariaLabel ?? gt("Progress");

    return (
        <svg
            {...props}
            aria-hidden={isDecorative || undefined}
            aria-label={isDecorative ? undefined : label}
            height="20"
            role={isDecorative ? undefined : role}
            style={{ color: "currentcolor" }}
            viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
            width="20"
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
