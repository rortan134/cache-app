"use client";

import { getOwnerDocument, getOwnerWindow } from "@/lib/common/dom";
import {
    isTheme,
    THEME_MEDIA_QUERY,
    THEME_STORAGE_KEY,
} from "@/lib/common/theme";
import type { Theme } from "@/lib/common/theme";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useEffect, useSyncExternalStore } from "react";

export type { Theme } from "@/lib/common/theme";

interface ThemeSnapshot {
    systemDark: boolean;
    theme: Theme;
}

const DEFAULT_THEME_SNAPSHOT: ThemeSnapshot = {
    systemDark: false,
    theme: "system",
};
const THEME_COLOR_META_NAME = "theme-color";
const DYNAMIC_THEME_COLOR_SELECTOR = `meta[name="${THEME_COLOR_META_NAME}"][data-dynamic-theme-color="true"]`;

let listeners: Array<() => void> = [];
let lastSnapshot: ThemeSnapshot | null = null;

function emitChange() {
    for (const listener of listeners) {
        listener();
    }
}

function hasThemeStorage() {
    return typeof getOwnerWindow().localStorage !== "undefined";
}

function getSystemDark() {
    return getOwnerWindow().matchMedia(THEME_MEDIA_QUERY).matches;
}

function getStored(): Theme {
    if (!hasThemeStorage()) {
        return DEFAULT_THEME_SNAPSHOT.theme;
    }
    try {
        const raw = getOwnerWindow().localStorage.getItem(THEME_STORAGE_KEY);
        if (isTheme(raw)) {
            return raw;
        }
    } catch {
        return DEFAULT_THEME_SNAPSHOT.theme;
    }
    return DEFAULT_THEME_SNAPSHOT.theme;
}

function ensureThemeColorMetaTag(): HTMLMetaElement {
    const ownerDocument = getOwnerDocument();
    let element = ownerDocument.querySelector<HTMLMetaElement>(
        DYNAMIC_THEME_COLOR_SELECTOR
    );
    if (element) {
        return element;
    }
    element = ownerDocument.createElement("meta");
    element.name = THEME_COLOR_META_NAME;
    element.setAttribute("data-dynamic-theme-color", "true");
    ownerDocument.head.append(element);
    return element;
}

function normalizeThemeColor(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
        return null;
    }
    const normalized = trimmed.toLowerCase();
    if (
        normalized === "transparent" ||
        normalized === "rgba(0, 0, 0, 0)" ||
        normalized === "rgba(0 0 0 / 0)"
    ) {
        return null;
    }
    return trimmed;
}

function resolveBrowserChromeSurface(): HTMLElement {
    const ownerDocument = getOwnerDocument();
    return (
        ownerDocument.querySelector<HTMLElement>(
            "main[data-slot='sidebar-inset']"
        ) ??
        ownerDocument.querySelector<HTMLElement>(
            "[data-slot='sidebar-inner']"
        ) ??
        ownerDocument.body
    );
}

export function syncBrowserChromeTheme() {
    const ownerDocument = getOwnerDocument();
    const ownerWindow = getOwnerWindow();
    // Keep chrome backgrounds on the CSS token so theme flips re-resolve.
    // Baking a computed rgb here used to stick forever (inline > stylesheet).
    const tokenBackground = "var(--background)";
    ownerDocument.documentElement.style.backgroundColor = tokenBackground;
    ownerDocument.body.style.backgroundColor = tokenBackground;

    const surface = resolveBrowserChromeSurface();
    const surfaceColor = normalizeThemeColor(
        ownerWindow.getComputedStyle(surface).backgroundColor
    );
    const fallbackColor = normalizeThemeColor(
        ownerWindow.getComputedStyle(ownerDocument.body).backgroundColor
    );
    const themeColor = surfaceColor ?? fallbackColor;
    if (themeColor) {
        ensureThemeColorMetaTag().setAttribute("content", themeColor);
    }
}

function applyTheme(theme: Theme, suppressTransitions = false) {
    const ownerDocument = getOwnerDocument();
    const ownerWindow = getOwnerWindow();
    const documentElement = ownerDocument.documentElement;
    if (suppressTransitions) {
        documentElement.classList.add("no-transitions");
    }
    const isDark = theme === "dark" || (theme === "system" && getSystemDark());
    documentElement.classList.toggle("dark", isDark);
    documentElement.style.colorScheme = isDark ? "dark" : "light";
    syncBrowserChromeTheme();
    if (suppressTransitions) {
        documentElement.getBoundingClientRect();
        ownerWindow.requestAnimationFrame(() => {
            documentElement.classList.remove("no-transitions");
        });
    }
}

function getSnapshot(): ThemeSnapshot {
    if (!hasThemeStorage()) {
        return DEFAULT_THEME_SNAPSHOT;
    }
    const theme = getStored();
    const systemDark = theme === "system" ? getSystemDark() : false;

    if (
        lastSnapshot &&
        lastSnapshot.theme === theme &&
        lastSnapshot.systemDark === systemDark
    ) {
        return lastSnapshot;
    }
    lastSnapshot = { systemDark, theme };
    return lastSnapshot;
}

function getServerSnapshot() {
    return DEFAULT_THEME_SNAPSHOT;
}

function subscribe(listener: () => void): () => void {
    listeners.push(listener);

    const ownerWindow = getOwnerWindow();
    const mq = ownerWindow.matchMedia(THEME_MEDIA_QUERY);
    const handleChange = () => {
        if (getStored() === "system") {
            applyTheme("system", true);
        }
        emitChange();
    };
    mq.addEventListener("change", handleChange);

    const handleStorage = (e: StorageEvent) => {
        if (e.key === THEME_STORAGE_KEY) {
            applyTheme(getStored(), true);
            emitChange();
        }
    };
    ownerWindow.addEventListener("storage", handleStorage);

    return () => {
        listeners = listeners.filter((l) => l !== listener);
        mq.removeEventListener("change", handleChange);
        ownerWindow.removeEventListener("storage", handleStorage);
    };
}

if (typeof document !== "undefined") {
    applyTheme(getStored());
}

/** Keep the theme store subscribed and system preference in sync app-wide. */
export function ThemeEffect() {
    useTheme();
    return null;
}

export function useTheme() {
    const snapshot = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );
    const theme = snapshot.theme;
    const colorScheme = snapshot.systemDark ? "dark" : "light";
    const resolvedTheme: "light" | "dark" =
        theme === "system" ? colorScheme : theme;

    const setTheme = useStableCallback((next: Theme) => {
        if (!hasThemeStorage()) {
            return;
        }
        getOwnerWindow().localStorage.setItem(THEME_STORAGE_KEY, next);
        applyTheme(next, true);
        emitChange();
    });

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    return { resolvedTheme, setTheme, theme } as const;
}
