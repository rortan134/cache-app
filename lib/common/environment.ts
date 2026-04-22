import { canUseDOM } from "@/lib/common/dom";

declare global {
    interface Document {
        documentMode?: unknown;
    }

    interface Window {
        MSStream?: unknown;
    }
}

const documentMode =
    canUseDOM && "documentMode" in document ? document.documentMode : null;

export const hasNavigator = typeof navigator !== "undefined";

export const CAN_USE_BEFORE_INPUT =
    canUseDOM && "InputEvent" in window && !documentMode
        ? "getTargetRanges" in new window.InputEvent("input")
        : false;

export const IS_APPLE =
    canUseDOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const IS_IOS =
    canUseDOM &&
    // iPads can claim to be MacIntel
    ((navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
        /iPad|iPhone|iPod|iOS/.test(navigator.userAgent)) &&
    !window.MSStream;

export const IS_ANDROID = canUseDOM && /Android/i.test(navigator.userAgent);

export const IS_FIREFOX =
    canUseDOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

// Exclude Android — Android WebView's UA contains "Version/X.X ... Safari/537.36"
// which falsely matches the Safari regex, activating wrong composition code paths.
export const IS_SAFARI =
    canUseDOM &&
    /Version\/[\d.]+.*Safari/.test(navigator.userAgent) &&
    !IS_ANDROID;

// Keep these in case we need to use them in the future.
// export const IS_WINDOWS = canUseDOM && /Win/.test(navigator.platform);
export const IS_CHROME =
    canUseDOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent = canUseDOM && 'TextEvent' in window && !documentMode;

export const IS_ANDROID_CHROME = canUseDOM && IS_ANDROID && IS_CHROME;

export const IS_WEBKIT =
    typeof CSS === "undefined" || !CSS.supports
        ? false
        : CSS.supports("-webkit-backdrop-filter:none");

export const IS_APPLE_WEBKIT =
    canUseDOM &&
    /AppleWebKit\/[\d.]+/.test(navigator.userAgent) &&
    IS_APPLE &&
    !IS_CHROME;

export const getSystemControlKey = () => (IS_APPLE ? "⌘" : "Ctrl");
