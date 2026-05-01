"use client";

/**
 * @see https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/compose-refs.tsx
 */

import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;
type RefCleanup<T> = ReturnType<React.RefCallback<T>>;

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
function setRef<T>(ref: PossibleRef<T>, value: T | null): RefCleanup<T> {
    if (typeof ref === "function") {
        return ref(value);
    }

    if (ref !== null && ref !== undefined) {
        ref.current = value;
    }
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
function composeRefs<T>(
    ...refs: readonly PossibleRef<T>[]
): React.RefCallback<T> {
    return (node) => {
        const cleanups = refs.map((ref) => setRef(ref, node));

        // React <19 will log an error to the console if a callback ref returns a
        // value. We don't use ref cleanups internally so this will only happen if a
        // user's ref callback returns a value, which we only expect if they are
        // using the cleanup functionality added in React 19.
        if (cleanups.some((cleanup) => typeof cleanup === "function")) {
            return () => {
                for (let i = 0; i < cleanups.length; i++) {
                    const cleanup = cleanups[i];
                    if (typeof cleanup === "function") {
                        cleanup();
                    } else {
                        setRef(refs[i], null);
                    }
                }
            };
        }
    };
}

/**
 * A custom hook that composes multiple refs
 * Accepts callback refs and RefObject(s)
 */
function useComposedRefs<T>(
    ...refs: readonly PossibleRef<T>[]
): React.RefCallback<T> {
    // biome-ignore lint/correctness/useExhaustiveDependencies: we want to memoize by all values
    return React.useCallback(composeRefs(...refs), refs);
}

export { useComposedRefs };
