"use client";

import type { DesktopPlatform } from "@/lib/desktop/constants";
import { detectDesktopPlatform, isDesktopApp } from "@/lib/desktop/platform";
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

export function useDesktopApp(): {
    isDesktopApp: boolean;
    loaded: boolean;
    platform: DesktopPlatform | null;
} {
    const [result, setResult] = useState<{
        isDesktopApp: boolean;
        loaded: boolean;
        platform: DesktopPlatform | null;
    }>({ isDesktopApp: false, loaded: false, platform: null });

    useEffect(() => {
        setResult({
            isDesktopApp: isDesktopApp(),
            loaded: true,
            platform: detectDesktopPlatform(),
        });
    }, []);

    return result;
}
