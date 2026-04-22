"use client";

import type { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

type OnOpenChange = CollapsiblePrimitive.Root.Props["onOpenChange"];
type OpenChangeDetails = Parameters<NonNullable<OnOpenChange>>[1];

interface UseListPanelOpenStateOptions {
    hotkey: string;
    onOpenChange?: OnOpenChange;
    open?: boolean;
    state: {
        isOpen: boolean;
        setIsOpen: (open: boolean) => void;
    };
}

function createHotkeyOpenChangeDetails(
    event: KeyboardEvent
): OpenChangeDetails {
    const details: OpenChangeDetails = {
        allowPropagation() {
            details.isPropagationAllowed = true;
        },
        cancel() {
            details.isCanceled = true;
        },
        event,
        isCanceled: false,
        isPropagationAllowed: false,
        reason: "trigger-press",
        trigger: undefined,
    };

    return details;
}

export function useListPanelOpenState({
    hotkey,
    onOpenChange,
    open,
    state,
}: UseListPanelOpenStateOptions) {
    const { isOpen: uncontrolledOpen, setIsOpen } = state;
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled ? open : uncontrolledOpen;

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
        (event) => {
            handleOpenChange(
                !resolvedOpen,
                createHotkeyOpenChangeDetails(event)
            );
        },
        {
            preventDefault: true,
        },
        [handleOpenChange, resolvedOpen]
    );

    return {
        isOpen: resolvedOpen,
        onOpenChange: handleOpenChange,
    };
}
