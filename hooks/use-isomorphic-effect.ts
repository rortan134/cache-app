"use client";

import { canUseDOM } from "@/lib/common/dom";
import * as React from "react";

/**
 * A layout effect that safely falls back to a regular effect during server-side
 * rendering to avoid React warnings about useLayoutEffect on the server.
 */
export const useIsomorphicLayoutEffect = canUseDOM
    ? React.useLayoutEffect
    : React.useEffect;
