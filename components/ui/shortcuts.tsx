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
import { stopPropagationForPrintableKeys } from "@/lib/common/dom";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import * as React from "react";
import { useHotkeys, useHotkeysContext } from "react-hotkeys-hook";

interface ShortcutItem {
    description: string;
    hotkey: string;
    label: string;
}

/**
 * Button that opens a read-only drawer listing all library keyboard shortcuts.
 *
 * Splits `keys` on "+" so multi-part shortcuts render as separate `<Kbd>`
 * pills without callers having to pre-format them.
 */
export function KeyboardShortcutsDialogTrigger(
    props: React.ComponentProps<typeof DrawerTrigger>
) {
    const [isOpen, setIsOpen] = React.useState(false);
    const { hotkeys } = useHotkeysContext();

    const handleOpen = useStableCallback(() => {
        setIsOpen(true);
    });

    useHotkeys("mod+/, ?", handleOpen, {
        description: "Open keyboard shortcuts panel",
    });

    const shortcutItems: ShortcutItem[] = hotkeys.map((shortcut) => ({
        description: shortcut.description ?? "",
        hotkey: shortcut.hotkey,
        label: `${shortcut.description ?? ""} ${shortcut.hotkey}`,
    }));

    return (
        <Drawer onOpenChange={setIsOpen} open={isOpen} position="right">
            <DrawerTrigger {...props} />
            <DrawerViewport>
                <DrawerPopup shouldShowCloseButton>
                    <DrawerHeader>
                        <DrawerTitle>Keyboard shortcuts</DrawerTitle>
                    </DrawerHeader>
                    <DrawerPanel
                        className="px-5"
                        isScrollable={false}
                        onKeyDown={stopPropagationForPrintableKeys}
                    >
                        <Command inline items={shortcutItems} open>
                            <CommandInput placeholder="Search..." />
                            <CommandList className="px-0">
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
                                                            .split("+")
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
}

function ShortcutKeyPart({ part }: { part: string }) {
    const lowerPart = part.toLowerCase();
    if (lowerPart === "mod") {
        return <CmdKbd />;
    }
    if (lowerPart === "alt") {
        return <AltKbd />;
    }
    if (lowerPart === "shift") {
        return <ShiftKbd />;
    }
    return part;
}

// Re-exporting with "use client"
export { HotkeysProvider as ShortcutsProvider } from "react-hotkeys-hook";
