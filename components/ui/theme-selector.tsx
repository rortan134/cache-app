"use client";

import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { useTheme } from "@/hooks/use-theme";
import { Monitor, Sun } from "lucide-react";

const THEME_OPTIONS = [
    { icon: Sun, label: "Use light theme", value: "light" },
    // { icon: Moon, label: "Use dark theme", value: "dark" },
    { icon: Monitor, label: "Use system theme", value: "system" },
] as const;

export function ThemeSelector() {
    const { setTheme, theme } = useTheme();

    return (
        <Group aria-label="Theme">
            {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
                const isSelected = theme === value;

                return (
                    <Button
                        aria-label={label}
                        aria-pressed={isSelected}
                        data-pressed={isSelected ? "" : undefined}
                        key={value}
                        onClick={() => setTheme(value)}
                        size="icon-sm"
                        title={label}
                        variant="secondary"
                    >
                        <Icon className="size-4" />
                    </Button>
                );
            })}
        </Group>
    );
}
