"use client";

import type { Collapsible } from "@base-ui/react/collapsible";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useHotkeys } from "react-hotkeys-hook";

type OnOpenChange = Collapsible.Root.Props["onOpenChange"];
type OpenChangeDetails = Parameters<NonNullable<OnOpenChange>>[1];

interface UseListPanelOpenStateOptions {
    hotkey: string;
    onOpenChange?: OnOpenChange;
    open?: boolean;
    state: readonly [isOpen: boolean, setIsOpen: (open: boolean) => void];
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

/**
 * Manages open/close state for a collapsible list panel, including hotkey
 * support with proper Base UI Collapsible event details.
 */
export function useListPanelOpenState({
    hotkey,
    onOpenChange,
    open,
    state,
}: UseListPanelOpenStateOptions) {
    const [uncontrolledOpen, setIsOpen] = state;
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : uncontrolledOpen;

    const handleOpenChange = useStableCallback<NonNullable<OnOpenChange>>(
        (nextOpen, eventDetails) => {
            if (!isControlled) {
                setIsOpen(nextOpen);
            }
            onOpenChange?.(nextOpen, eventDetails);
        }
    );

    useHotkeys(
        hotkey,
        (event) => {
            handleOpenChange(
                !isOpen,
                createHotkeyOpenChangeDetails(event)
            );
        },
        { preventDefault: true },
        [handleOpenChange, isOpen]
    );

    return [isOpen, handleOpenChange] as const;
}
