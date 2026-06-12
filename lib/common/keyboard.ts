import { canUseDOM } from "@/lib/common/dom";

const IS_APPLE = canUseDOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const getSystemControlKey = () => (IS_APPLE ? "⌘" : "Ctrl");
export const getSystemAltKey = () => (IS_APPLE ? "⌥" : "Alt");
export const getSystemShiftKey = () => (IS_APPLE ? "⇧" : "Shift");
