"use client";

import { useDesktopApp } from "@/lib/desktop/use-desktop-platform";
import { useLocale } from "gt-next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type * as React from "react";

export function DesktopHomeRedirect({ children }: React.PropsWithChildren) {
    const router = useRouter();
    const locale = useLocale();
    const { isDesktopApp } = useDesktopApp();

    useEffect(() => {
        if (isDesktopApp) {
            router.replace(`/${locale}/signin`);
        }
    }, [isDesktopApp, locale, router]);

    if (isDesktopApp) {
        return null;
    }

    return children;
}
