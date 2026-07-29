"use client";

import { detectDesktopPlatform } from "@/lib/desktop/platform";
import type { DesktopPlatform } from "@/lib/desktop/constants";
import { useEffect, useState } from "react";

export function useDesktopPlatform(): {
    isDesktop: boolean;
    platform: DesktopPlatform | null;
} {
    const [platform, setPlatform] = useState<DesktopPlatform | null>(null);

    useEffect(() => {
        setPlatform(detectDesktopPlatform());
    }, []);

    return {
        isDesktop: platform !== null,
        platform,
    };
}
