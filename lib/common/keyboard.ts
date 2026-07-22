import { canUseDOM } from "@/lib/common/dom";
import type { KeyboardEvent } from "react";

const IS_APPLE =
    canUseDOM &&
    (/Mac|iPod|iPhone|iPad/.test(navigator.platform) ||
        // iPadOS 13+ reports "MacIntel" for navigator.platform.
        // maxTouchPoints > 1 is the canonical way to detect iPad on MacIntel.
        (navigator.platform === "MacIntel" &&
            typeof navigator.maxTouchPoints === "number" &&
            navigator.maxTouchPoints > 1));

export const getSystemControlKey = () => (IS_APPLE ? "⌘" : "Ctrl");
export const getSystemAltKey = () => (IS_APPLE ? "⌥" : "Alt");
export const getSystemShiftKey = () => (IS_APPLE ? "⇧" : "Shift");

export function isKeyboardActivation(event: KeyboardEvent) {
    if (event.nativeEvent.isComposing) {
        // Ignore key events during IME composition
        return false;
    }
    return (
        event.key === "Enter" ||
        event.key === "Process" ||
        event.key === " " ||
        event.code === "Space"
    );
}
