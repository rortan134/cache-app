"use client";

import { domAnimation, LazyMotion } from "motion/react";
import type * as React from "react";

/**
 * Client boundary for motion's LazyMotion so `domAnimation` (includes a
 * renderer function) never crosses the RSC → client serialization boundary.
 * App shell layouts stay server components; place this under them once.
 */
export function MotionProvider({ children }: React.PropsWithChildren) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}
