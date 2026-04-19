"use client";

import {
    Dialog,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import type * as React from "react";

const KEYBOARD_SHORTCUTS = [
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
        keys: "⌘/Ctrl+1-9",
        label: "Run command palette item 1-9",
    },
];

export const KeyboardShortcutsDialogTrigger = (
    props: React.ComponentProps<typeof DialogTrigger>
) => (
    <Dialog>
        <DialogTrigger {...props} />
        <DialogPopup showCloseButton>
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
                                <Kbd key={i}>{part}</Kbd>
                            ))}
                        </KbdGroup>
                    </div>
                ))}
            </DialogPanel>
        </DialogPopup>
    </Dialog>
);
