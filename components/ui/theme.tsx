"use client";

import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/common/cn";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Monitor, Moon, Sun } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

const THEME_OPTIONS = [
    { icon: Sun, label: "Use light theme", value: "light" },
    { icon: Moon, label: "Use dark theme", value: "dark" },
    { icon: Monitor, label: "Use system theme", value: "system" },
] as const;

const THEME_CYCLE: readonly Theme[] = ["light", "dark", "system"];

function getNextTheme(current: Theme): Theme {
    const index = THEME_CYCLE.indexOf(current);
    return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? "light";
}

export function ThemeSelector() {
    const { theme } = useTheme();

    return (
        <Group aria-label="Theme">
            {THEME_OPTIONS.map(({ icon: Icon, label, value }) => (
                <ThemeButton
                    Icon={Icon}
                    isSelected={theme === value}
                    key={value}
                    label={label}
                    value={value}
                />
            ))}
        </Group>
    );
}

export function ThemeHotkey() {
    const { theme, setTheme } = useTheme();

    const handleThemeToggle = useStableCallback(() => {
        setTheme(getNextTheme(theme));
    });

    useHotkeys("mod+shift+d", handleThemeToggle, {
        description: "Cycle theme: light → dark → system",
        enableOnFormTags: false,
        preventDefault: true,
    });

    return null;
}

interface ThemeButtonProps {
    Icon: typeof Sun;
    isSelected: boolean;
    label: string;
    value: Theme;
}

function ThemeButton({ Icon, isSelected, label, value }: ThemeButtonProps) {
    const { setTheme } = useTheme();

    const handleClick = useStableCallback(() => {
        setTheme(value);
    });

    return (
        <Button
            aria-label={label}
            aria-pressed={isSelected}
            className={cn(
                isSelected &&
                    "bg-accent text-accent-foreground hover:bg-accent/90 data-pressed:bg-accent/90"
            )}
            data-pressed={isSelected ? "" : undefined}
            onClick={handleClick}
            size="icon-sm"
            title={label}
            variant="secondary"
        >
            <Icon className="size-4" />
        </Button>
    );
}
