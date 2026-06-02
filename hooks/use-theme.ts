"use client";

import { canUseDOM, getOwnerDocument, getOwnerWindow } from "@/lib/common/dom";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeSnapshot {
    systemDark: boolean;
    theme: Theme;
}

const STORAGE_KEY = "t3code:theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const DARK_MODE_ENABLED = false;
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
    return canUseDOM && typeof getOwnerWindow().localStorage !== "undefined";
}

function getSystemDark() {
    return canUseDOM && getOwnerWindow().matchMedia(MEDIA_QUERY).matches;
}

function getStored(): Theme {
    if (!hasThemeStorage()) {
        return DEFAULT_THEME_SNAPSHOT.theme;
    }
    try {
        const raw = getOwnerWindow().localStorage.getItem(STORAGE_KEY);
        if (raw === "dark" && !DARK_MODE_ENABLED) {
            return "light";
        }
        if (raw === "light" || raw === "dark" || raw === "system") {
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
    const normalizedValue = value?.trim().toLowerCase();
    if (
        !normalizedValue ||
        normalizedValue === "transparent" ||
        normalizedValue === "rgba(0, 0, 0, 0)" ||
        normalizedValue === "rgba(0 0 0 / 0)"
    ) {
        return null;
    }

    return value?.trim() ?? null;
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
    if (!canUseDOM) {
        return;
    }
    const ownerDocument = getOwnerDocument();
    const ownerWindow = getOwnerWindow();
    const surfaceColor = normalizeThemeColor(
        ownerWindow.getComputedStyle(resolveBrowserChromeSurface())
            .backgroundColor
    );
    const fallbackColor = normalizeThemeColor(
        ownerWindow.getComputedStyle(ownerDocument.body).backgroundColor
    );
    const backgroundColor = surfaceColor ?? fallbackColor;
    if (!backgroundColor) {
        return;
    }

    ownerDocument.documentElement.style.backgroundColor = backgroundColor;
    ownerDocument.body.style.backgroundColor = backgroundColor;
    ensureThemeColorMetaTag().setAttribute("content", backgroundColor);
}

function applyTheme(theme: Theme, suppressTransitions = false) {
    if (!canUseDOM) {
        return;
    }
    const ownerDocument = getOwnerDocument();
    const ownerWindow = getOwnerWindow();
    const documentElement = ownerDocument.documentElement;
    if (suppressTransitions) {
        documentElement.classList.add("no-transitions");
    }
    const isDark =
        DARK_MODE_ENABLED &&
        (theme === "dark" || (theme === "system" && getSystemDark()));
    documentElement.classList.toggle("dark", isDark);
    documentElement.style.colorScheme = isDark ? "dark" : "light";
    syncBrowserChromeTheme();
    if (suppressTransitions) {
        // biome-ignore lint/suspicious/noUnusedExpressions: Force a reflow so the no-transitions class takes effect before removal
        documentElement.offsetHeight;
        ownerWindow.requestAnimationFrame(() => {
            documentElement.classList.remove("no-transitions");
        });
    }
}

if (canUseDOM) {
    applyTheme(getStored());
}

function getSnapshot(): ThemeSnapshot {
    if (!hasThemeStorage()) {
        return DEFAULT_THEME_SNAPSHOT;
    }
    const theme = getStored();
    const systemDark =
        DARK_MODE_ENABLED && theme === "system" ? getSystemDark() : false;

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
    if (!canUseDOM) {
        return () => {
            // No-op during SSR
        };
    }
    listeners.push(listener);

    // Listen for system preference changes
    const ownerWindow = getOwnerWindow();
    const mq = ownerWindow.matchMedia(MEDIA_QUERY);
    const handleChange = () => {
        if (getStored() === "system") {
            applyTheme("system", true);
        }
        emitChange();
    };
    mq.addEventListener("change", handleChange);

    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) {
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
        const theme = next === "dark" && !DARK_MODE_ENABLED ? "light" : next;
        getOwnerWindow().localStorage.setItem(STORAGE_KEY, theme);
        applyTheme(theme, true);
        emitChange();
    });

    // Keep DOM in sync on mount/change
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    return { resolvedTheme, setTheme, theme } as const;
}
