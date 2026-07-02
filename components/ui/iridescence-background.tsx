"use client";

import * as React from "react";
import { canUseDOM, getOwnerDocument, getOwnerWindow } from "@/lib/common/dom";

const UNICORN_PROJECT_ID = "XbMh8JZ8sBt8du5zfTgn";
const UNICORN_SCRIPT_ID = "unicorn-studio-sdk";
const UNICORN_STYLE_ID = "unicorn-studio-watermark-style";
const UNICORN_SDK_URL =
    "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.12/dist/unicornStudio.umd.js";
const UNICORN_WATERMARK_SELECTOR = [
    'a[href*="unicorn.studio" i]',
    'a[href*="hiunicornstudio" i]',
    'a[title*="made with" i]',
    'a[title*="unicorn" i]',
    'button[title*="made with" i]',
    'button[title*="unicorn" i]',
    'a[aria-label*="made with" i]',
    'a[aria-label*="unicorn" i]',
    'button[aria-label*="made with" i]',
    'button[aria-label*="unicorn" i]',
].join(",");
const UNICORN_WATERMARK_TEXT_SELECTOR = "a,button";

interface UnicornStudioGlobal {
    init: () => void;
    isInitialized?: boolean;
}

declare global {
    interface Window {
        UnicornStudio?: UnicornStudioGlobal;
    }
}

function isLowPowerDevice(): boolean {
    if (!canUseDOM) {
        return true;
    }
    const ownerWindow = getOwnerWindow();
    if (ownerWindow.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return true;
    }
    if (ownerWindow.matchMedia("(prefers-reduced-data: reduce)").matches) {
        return true;
    }
    if (ownerWindow.matchMedia("(hover: none) and (pointer: coarse)").matches) {
        return true;
    }
    if (
        "hardwareConcurrency" in navigator &&
        navigator.hardwareConcurrency <= 4
    ) {
        return true;
    }
    return false;
}

export function IridescenceBackground() {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isLowPowerDevice()) {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const ownerDocument = getOwnerDocument(container);
        installUnicornWatermarkStyle(ownerDocument);

        removeUnicornWatermark(container);

        const observer = new MutationObserver(() => {
            removeUnicornWatermark(container);
        });
        observer.observe(container, { childList: true, subtree: true });

        if (window.UnicornStudio?.init) {
            initUnicornStudio();
            removeUnicornWatermark(container);

            return () => {
                observer.disconnect();
            };
        }

        const existingScript = ownerDocument.getElementById(UNICORN_SCRIPT_ID);
        if (existingScript) {
            const handleLoad = () => {
                initUnicornStudio();
                removeUnicornWatermark(container);
            };

            existingScript.addEventListener("load", handleLoad);

            return () => {
                observer.disconnect();
                existingScript.removeEventListener("load", handleLoad);
            };
        }

        const script = ownerDocument.createElement("script");
        script.async = true;
        script.id = UNICORN_SCRIPT_ID;
        script.src = UNICORN_SDK_URL;
        const handleLoad = () => {
            initUnicornStudio();
            removeUnicornWatermark(container);
        };
        script.addEventListener("load", handleLoad);
        ownerDocument.head.appendChild(script);

        return () => {
            observer.disconnect();
            script.removeEventListener("load", handleLoad);
        };
    }, []);

    return (
        <div
            className="pointer-events-none absolute inset-0 select-none"
            data-us-project={UNICORN_PROJECT_ID}
            ref={containerRef}
            style={{ height: "100%", width: "100%" }}
        />
    );
}

function initUnicornStudio() {
    window.UnicornStudio?.init();
}

function installUnicornWatermarkStyle(ownerDocument: Document) {
    if (ownerDocument.getElementById(UNICORN_STYLE_ID)) {
        return;
    }

    const style = ownerDocument.createElement("style");
    style.id = UNICORN_STYLE_ID;
    style.textContent = `
        [data-us-project="${UNICORN_PROJECT_ID}"] :is(${UNICORN_WATERMARK_SELECTOR}) {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            visibility: hidden !important;
        }
    `;
    ownerDocument.head.appendChild(style);
}

function removeUnicornWatermark(container: HTMLElement) {
    const elements = container.querySelectorAll(UNICORN_WATERMARK_SELECTOR);
    for (const element of elements) {
        element.remove();
    }

    const descendants = container.querySelectorAll(
        UNICORN_WATERMARK_TEXT_SELECTOR
    );
    for (const descendant of descendants) {
        const text = descendant.textContent?.toLowerCase() ?? "";
        if (!(text.includes("made with") || text.includes("unicorn"))) {
            continue;
        }

        descendant.remove();
    }
}
