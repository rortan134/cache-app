"use client";

import { useAccess } from "@/hooks/use-access";
import type * as React from "react";

function PrivilegedOnly({
    children,
    loadingRender,
}: React.PropsWithChildren<{ loadingRender?: React.ReactNode }>) {
    const { hasAccess, isLoading } = useAccess();

    if (isLoading && typeof loadingRender !== "undefined") {
        return loadingRender;
    }

    if (hasAccess) {
        return children;
    }

    return null;
}

function UnprivilegedOnly({
    children,
    loadingRender,
}: React.PropsWithChildren<{ loadingRender?: React.ReactNode }>) {
    const { hasAccess, isLoading } = useAccess();

    if (isLoading && typeof loadingRender !== "undefined") {
        return loadingRender;
    }

    if (hasAccess) {
        return null;
    }

    return children;
}

export { PrivilegedOnly, UnprivilegedOnly };
