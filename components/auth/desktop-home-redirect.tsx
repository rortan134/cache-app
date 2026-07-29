"use client";

import { useDesktopApp } from "@/lib/desktop/use-desktop-platform";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function DesktopHomeRedirect({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isDesktopApp } = useDesktopApp();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isDesktopApp) {
            const locale = pathname.split("/")[1] || "en";
            router.replace(`/${locale}/signin`);
        }
    }, [isDesktopApp, pathname, router]);

    if (isDesktopApp) {
        return null;
    }

    return children;
}
