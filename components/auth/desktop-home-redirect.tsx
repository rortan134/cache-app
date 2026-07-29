"use client";

import { useDesktopPlatform } from "@/lib/desktop/use-desktop-platform";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function DesktopHomeRedirect({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isDesktop } = useDesktopPlatform();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isDesktop) {
            const locale = pathname.split("/")[1] || "en";
            router.replace(`/${locale}/signin`);
        }
    }, [isDesktop, pathname, router]);

    if (isDesktop) {
        return null;
    }

    return children;
}
