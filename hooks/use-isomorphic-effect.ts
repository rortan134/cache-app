"use client";

import { canUseDOM } from "@/lib/common/dom";
import * as React from "react";

export const useIsomorphicLayoutEffect = canUseDOM
    ? React.useLayoutEffect
    : React.useEffect;
