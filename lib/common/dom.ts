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
