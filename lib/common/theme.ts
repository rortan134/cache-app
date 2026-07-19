export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "cache:theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * Blocking inline script for the document head. Applies the stored theme
 * before first paint so CSS tokens and native form chrome match immediately.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var d=t==="dark"||(t==="system"&&matchMedia(${JSON.stringify(THEME_MEDIA_QUERY)}).matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(e){}})();`;

export function isTheme(value: string | null | undefined): value is Theme {
    return value === "light" || value === "dark" || value === "system";
}
