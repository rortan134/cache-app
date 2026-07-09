"use client";

import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Monitor, Moon, Sun } from "lucide-react";

const THEME_OPTIONS = [
    { icon: Sun, label: "Use light theme", value: "light" },
    { icon: Moon, label: "Use dark theme", value: "dark" },
    { icon: Monitor, label: "Use system theme", value: "system" },
] as const;

export function ThemeSelector() {
    const { theme } = useTheme();

    return (
        <Group aria-label="Theme">
            {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
                const isSelected = theme === value;

                return (
                    <ThemeButton
                        Icon={Icon}
                        isSelected={isSelected}
                        key={value}
                        label={label}
                        value={value}
                    />
                );
            })}
        </Group>
    );
}

function ThemeButton({
    Icon,
    isSelected,
    label,
    value,
}: {
    Icon: typeof Sun;
    isSelected: boolean;
    label: string;
    value: Theme;
}) {
    const { setTheme } = useTheme();
    const handleClick = useStableCallback(() => setTheme(value));

    return (
        <Button
            aria-label={label}
            aria-pressed={isSelected}
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
