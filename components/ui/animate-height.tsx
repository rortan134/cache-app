"use client";

import { cn } from "@/lib/common/cn";
import { useComposedRefs, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type * as React from "react";
import useMeasure from "react-use-measure";

const AnimateHeight = ({
    className,
    ref,
    ...props
}: React.ComponentProps<"div">) => {
    const shouldReduceMotion = useReducedMotion();
    const [internalRef, bounds] = useMeasure({ offsetSize: true });
    const composedRefs = useComposedRefs(ref, internalRef);

    const height: number | "auto" = bounds.height > 0 ? bounds.height : "auto";
    const animateTo = { height };

    return (
        <m.div
            animate={shouldReduceMotion ? {} : animateTo}
            className={cn("relative w-full overflow-hidden", className)}
            style={shouldReduceMotion ? {} : animateTo}
            transition={{ damping: 25, stiffness: 200, type: "spring" }}
        >
            <div ref={composedRefs} {...props} />
        </m.div>
    );
};

export { AnimateHeight };
