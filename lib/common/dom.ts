export const canUseDOM =
    typeof window !== "undefined" &&
    typeof window.document !== "undefined" &&
    typeof window.document.createElement !== "undefined";

export function getOwnerWindow(node?: Node | Document | null | undefined) {
    if (!canUseDOM) {
        throw new Error("Cannot access window outside of the DOM");
    }
    return node?.ownerDocument?.defaultView ?? globalThis.window;
}

export function getOwnerDocument(node?: Node | Document | null | undefined) {
    if (!canUseDOM) {
        throw new Error("Cannot access document outside of the DOM");
    }
    return node?.ownerDocument ?? globalThis.document;
}

export function getComputedStyle(element: Element, pseudoElement?: string) {
    return getOwnerWindow(element).getComputedStyle(element, pseudoElement);
}

/**
 * Stops React's synthetic keydown from bubbling past the caller for single
 * printable keys, isolating the input from a Base UI `Menu` ancestor's
 * `useTypeahead` handler — which would otherwise `preventDefault` the
 * character.
 */
export function stopPropagationForPrintableKeys(event: React.KeyboardEvent) {
    if (
        event.key.length === 1 &&
        event.key !== " " &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
    ) {
        event.stopPropagation();
    }
}
