"use client";

import { useTheme } from "@/hooks/use-theme";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useHotkeys } from "react-hotkeys-hook";

const THEME_CYCLE: Array<"light" | "dark" | "system"> = [
    "light",
    "dark",
    "system",
];

function getNextTheme(
    current: "light" | "dark" | "system"
): "light" | "dark" | "system" {
    const index = THEME_CYCLE.indexOf(current);
    return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? "light";
}

export function ThemeHotkey() {
    const { theme, setTheme } = useTheme();

    const handleThemeToggle = useStableCallback(() => {
        setTheme(getNextTheme(theme));
    });

    useHotkeys("mod+shift+d", handleThemeToggle, {
        description: "Cycle theme: light → dark → system",
        enableOnFormTags: false,
    });

    return null;
}
