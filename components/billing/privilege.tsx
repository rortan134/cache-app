"use client";

import { useAccess } from "@/hooks/use-access";
import type { PropsWithChildren, ReactNode } from "react";

function PrivilegedOnly({
    children,
    loadingRender = null,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { hasAccess, isLoading } = useAccess();

    if (isLoading) {
        return loadingRender;
    }

    return hasAccess ? children : null;
}

function UnprivilegedOnly({
    children,
    loadingRender = null,
}: PropsWithChildren<{ loadingRender?: ReactNode }>) {
    const { hasAccess, isLoading } = useAccess();

    if (isLoading) {
        return loadingRender;
    }

    return hasAccess ? null : children;
}

export { PrivilegedOnly, UnprivilegedOnly };
