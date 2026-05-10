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
import { useHotkeys, useHotkeysContext } from "react-hotkeys-hook";

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
    const { hotkeys } = useHotkeysContext();

    useHotkeys(
        "mod+/",
        () => {
            setOpen(true);
        },
        { description: "Open keyboard shortcuts panel" }
    );

    return (
        <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger {...props} />
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                </DialogHeader>
                <DialogPanel>
                    {hotkeys.map((shortcut) => (
                        <div
                            className="flex items-center justify-between"
                            key={shortcut.description}
                        >
                            <span className="my-3 flex items-center gap-2 font-medium text-foreground text-sm">
                                {shortcut.description}
                            </span>
                            <KbdGroup>
                                <Kbd className="uppercase">
                                    {shortcut.hotkey
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
                    ))}
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    );
};

// biome-ignore lint/performance/noBarrelFile: Re-exporting with "use client"
export { HotkeysProvider as ShortcutsProvider } from "react-hotkeys-hook";
