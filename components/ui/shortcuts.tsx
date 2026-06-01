"use client";

import {
    Command,
    CommandCollection,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Drawer,
    DrawerHeader,
    DrawerPanel,
    DrawerPopup,
    DrawerTitle,
    DrawerTrigger,
    DrawerViewport,
} from "@/components/ui/drawer";
import { AltKbd, CmdKbd, Kbd, KbdGroup, ShiftKbd } from "@/components/ui/kbd";
import { SearchIcon } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { useHotkeys, useHotkeysContext } from "react-hotkeys-hook";

interface ShortcutItem {
    description: string;
    hotkey: string;
    label: string;
}

function ShortcutKeyPart({ part }: { part: string }) {
    switch (part.toLowerCase()) {
        case "mod":
            return <CmdKbd />;
        case "alt":
            return <AltKbd />;
        case "shift":
            return <ShiftKbd />;
        default:
            return part;
    }
}

/**
 * Button that opens a read-only drawer listing all library keyboard shortcuts.
 *
 * Splits `keys` on "+" so multi-part shortcuts render as separate `<Kbd>`
 * pills without callers having to pre-format them.
 */
export const KeyboardShortcutsDialogTrigger = (
    props: React.ComponentProps<typeof DrawerTrigger>
) => {
    const [open, setOpen] = useState(false);
    const { hotkeys } = useHotkeysContext();

    useHotkeys(
        "mod+/",
        () => {
            setOpen(true);
        },
        { description: "Open keyboard shortcuts panel" }
    );

    const shortcutItems: ShortcutItem[] = hotkeys.map((shortcut) => ({
        description: shortcut.description ?? "",
        hotkey: shortcut.hotkey,
        label: `${shortcut.description ?? ""} ${shortcut.hotkey}`,
    }));

    return (
        <Drawer onOpenChange={setOpen} open={open} position="right">
            <DrawerTrigger {...props} />
            <DrawerViewport>
                <DrawerPopup showBar>
                    <DrawerHeader>
                        <DrawerTitle>Keyboard shortcuts</DrawerTitle>
                    </DrawerHeader>
                    <DrawerPanel scrollable={false}>
                        <Command inline items={shortcutItems} open>
                            <CommandInput
                                placeholder="Search shortcuts..."
                                startAddon={<SearchIcon className="size-4" />}
                            />
                            <CommandList>
                                <CommandEmpty>No shortcuts found.</CommandEmpty>
                                <CommandCollection>
                                    {(item: ShortcutItem) => (
                                        <CommandItem
                                            key={`${item.description}:${item.hotkey}`}
                                            value={item.label}
                                        >
                                            <div className="flex w-full items-center justify-between">
                                                <span className="font-medium text-foreground text-sm">
                                                    {item.description}
                                                </span>
                                                <KbdGroup>
                                                    <Kbd>
                                                        {item.hotkey
                                                            ?.split("+")
                                                            .map((part, i) => (
                                                                <ShortcutKeyPart
                                                                    key={i}
                                                                    part={part}
                                                                />
                                                            ))}
                                                    </Kbd>
                                                </KbdGroup>
                                            </div>
                                        </CommandItem>
                                    )}
                                </CommandCollection>
                            </CommandList>
                        </Command>
                    </DrawerPanel>
                </DrawerPopup>
            </DrawerViewport>
        </Drawer>
    );
};

// Re-exporting with "use client"
export { HotkeysProvider as ShortcutsProvider } from "react-hotkeys-hook";
