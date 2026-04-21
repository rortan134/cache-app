"use client";

import * as React from "react";

const noop = () => {
    // Empty
};

export const useIsomorphicLayoutEffect =
    typeof document === "undefined" ? noop : React.useLayoutEffect;
