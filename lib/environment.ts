import { canUseDOM } from "@/lib/dom";

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

export const IS_APPLE: boolean =
    canUseDOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const IS_FIREFOX: boolean =
    canUseDOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

export const CAN_USE_BEFORE_INPUT: boolean =
    canUseDOM && "InputEvent" in window && !documentMode
        ? "getTargetRanges" in new window.InputEvent("input")
        : false;

export const IS_IOS: boolean =
    canUseDOM &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

export const IS_ANDROID: boolean =
    canUseDOM && /Android/.test(navigator.userAgent);

// Exclude Android — Android WebView's UA contains "Version/X.X ... Safari/537.36"
// which falsely matches the Safari regex, activating wrong composition code paths.
export const IS_SAFARI: boolean =
    canUseDOM &&
    /Version\/[\d.]+.*Safari/.test(navigator.userAgent) &&
    !IS_ANDROID;

// Keep these in case we need to use them in the future.
// export const IS_WINDOWS: boolean = canUseDOM && /Win/.test(navigator.platform);
export const IS_CHROME: boolean =
    canUseDOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent: boolean = canUseDOM && 'TextEvent' in window && !documentMode;

export const IS_ANDROID_CHROME: boolean = canUseDOM && IS_ANDROID && IS_CHROME;

export const IS_APPLE_WEBKIT =
    canUseDOM &&
    /AppleWebKit\/[\d.]+/.test(navigator.userAgent) &&
    IS_APPLE &&
    !IS_CHROME;
