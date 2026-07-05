import { cn } from "@/lib/common/cn";
import { motion } from "motion/react";
import type * as React from "react";

const FADE_IN_DURATION = 0.5;
const STAY_DURATION = 1.5;
const FADE_OUT_DURATION = 0.3;

const HighlightIn = ({
    children,
    className,
    delay = 0,
    fadeOut = true,
    ...props
}: React.ComponentProps<typeof motion.span> & {
    delay?: number;
    fadeOut?: boolean;
}) => {
    const fadeOutDurationActual = fadeOut ? FADE_OUT_DURATION : 0;
    const totalDurationActual =
        FADE_IN_DURATION + STAY_DURATION + fadeOutDurationActual;
    const fadeInEndActual = FADE_IN_DURATION / totalDurationActual;
    const stayEndActual =
        (FADE_IN_DURATION + STAY_DURATION) / totalDurationActual;

    return (
        <motion.span
            {...props}
            animate={{ opacity: fadeOut ? [0, 1, 1, 0] : [0, 1, 1] }}
            className={cn("pointer-events-none select-none", className)}
            inert
            initial={{ opacity: 0 }}
            transition={{
                delay,
                duration: totalDurationActual,
                ease: fadeOut
                    ? ["easeInOut", "linear", "easeInOut"]
                    : ["easeInOut", "linear"],
                times: fadeOut
                    ? [0, fadeInEndActual, stayEndActual, 1]
                    : [0, fadeInEndActual, stayEndActual],
            }}
        >
            {children}
        </motion.span>
    );
};

export { HighlightIn };
