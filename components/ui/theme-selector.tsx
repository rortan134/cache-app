import { Button } from "@/components/ui/button";
import { Group } from "@/components/ui/group";
import { Monitor, Moon, Sun } from "lucide-react";

export function ThemeSelector() {
    return (
        <Group>
            <Button className="rounded-full" variant="secondary">
                <Sun className="size-4" />
            </Button>
            <Button className="rounded-full" variant="secondary">
                <Moon className="size-4" />
            </Button>
            <Button className="rounded-full" variant="secondary">
                <Monitor className="size-4" />
            </Button>
        </Group>
    );
}
