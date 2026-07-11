"use client";

import { cn } from "@/lib/common/cn";
import { motion } from "motion/react";
import type * as React from "react";

const FADE_IN_DURATION = 0.5;
const STAY_DURATION = 1.5;
const FADE_OUT_DURATION = 0.3;

export interface HighlightInProps
    extends React.ComponentProps<typeof motion.span> {
    delay?: number;
    shouldFadeOut?: boolean;
}

export function HighlightIn({
    children,
    className,
    delay = 0,
    shouldFadeOut = true,
    ...props
}: HighlightInProps) {
    const fadeOutDurationActual = shouldFadeOut ? FADE_OUT_DURATION : 0;
    const totalDurationActual =
        FADE_IN_DURATION + STAY_DURATION + fadeOutDurationActual;
    const fadeInEndActual = FADE_IN_DURATION / totalDurationActual;
    const stayEndActual =
        (FADE_IN_DURATION + STAY_DURATION) / totalDurationActual;

    return (
        <motion.span
            {...props}
            animate={{ opacity: shouldFadeOut ? [0, 1, 1, 0] : [0, 1, 1] }}
            className={cn("pointer-events-none select-none", className)}
            inert
            initial={{ opacity: 0 }}
            transition={{
                delay,
                duration: totalDurationActual,
                ease: shouldFadeOut
                    ? ["easeInOut", "linear", "easeInOut"]
                    : ["easeInOut", "linear"],
                times: shouldFadeOut
                    ? [0, fadeInEndActual, stayEndActual, 1]
                    : [0, fadeInEndActual, stayEndActual],
            }}
        >
            {children}
        </motion.span>
    );
}
