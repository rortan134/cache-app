"use client";

import {
    Dialog,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { AltKbd, CmdKbd, Kbd, KbdGroup, ShiftKbd } from "@/components/ui/kbd";
import type * as React from "react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

/**
 * Library-wide keyboard shortcuts exposed in the help dialog.
 *
 * Kept in a single array so the trigger and any future cheat-sheet
 * renderers stay in sync automatically.
 */
const KEYBOARD_SHORTCUTS = [
    {
        keys: "mod+G",
        label: "Search library",
    },
    {
        keys: "F",
        label: "Toggle feedback widget",
    },
    {
        keys: "S",
        label: "Open collection picker for hovered item",
    },
    {
        keys: "P",
        label: "Open priority picker for hovered collection",
    },
    {
        keys: "mod+I",
        label: "Toggle integrations panel",
    },
    {
        keys: "mod+C",
        label: "Toggle collections panel",
    },
    {
        keys: "mod+B",
        label: "Expand or collapse sidebar",
    },
    {
        keys: "mod+N",
        label: "Create new collection",
    },
    {
        keys: "mod+F",
        label: "Sort and organize collections",
    },
    {
        keys: "mod+1-9",
        label: "Run command palette item 1-9",
    },
    {
        keys: "mod+/",
        label: "Open keyboard shortcuts",
    },
];

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
 * Button that opens a read-only dialog listing all library keyboard shortcuts.
 *
 * Splits `keys` on "+" so multi-part shortcuts render as separate `<Kbd>`
 * pills without callers having to pre-format them.
 */
export const KeyboardShortcutsDialogTrigger = (
    props: React.ComponentProps<typeof DialogTrigger>
) => {
    const [open, setOpen] = useState(false);

    useHotkeys("mod+/", () => {
        setOpen(true);
    });

    return (
        <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger {...props} />
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                </DialogHeader>
                <DialogPanel>
                    {KEYBOARD_SHORTCUTS.map((shortcut) => (
                        <div
                            className="flex items-center justify-between"
                            key={shortcut.label}
                        >
                            <span className="my-3 flex items-center gap-2 font-medium text-foreground text-sm">
                                {shortcut.label}
                            </span>
                            <KbdGroup>
                                {shortcut.keys.split("+").map((part, i) => (
                                    <Kbd key={i}>
                                        <ShortcutKeyPart part={part} />
                                    </Kbd>
                                ))}
                            </KbdGroup>
                        </div>
                    ))}
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    );
};
