"use client";

import type { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

type OnOpenChange = CollapsiblePrimitive.Root.Props["onOpenChange"];

interface UseListPanelOpenStateOptions {
    hotkey: string;
    onOpenChange?: OnOpenChange;
    open?: boolean;
    state: {
        isOpen: boolean;
        setIsOpen: (open: boolean) => void;
    };
}

export function useListPanelOpenState({
    hotkey,
    onOpenChange,
    open,
    state,
}: UseListPanelOpenStateOptions) {
    const { isOpen: storedOpen, setIsOpen } = state;
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled ? open : storedOpen;

    const handleOpenChange = React.useCallback<NonNullable<OnOpenChange>>(
        (nextOpen, eventDetails) => {
            if (!isControlled) {
                setIsOpen(nextOpen);
            }

            onOpenChange?.(nextOpen, eventDetails);
        },
        [isControlled, onOpenChange, setIsOpen]
    );

    useHotkeys(
        hotkey,
        () => {
            if (!isControlled) {
                setIsOpen(!storedOpen);
            }
        },
        {
            preventDefault: true,
        },
        [isControlled, setIsOpen, storedOpen]
    );

    return {
        isOpen: resolvedOpen,
        onOpenChange: handleOpenChange,
    };
}
