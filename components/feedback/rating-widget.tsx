"use client";

import { useComposedRefs } from "@/hooks/compose-refs";
import { cn } from "@/lib/cn";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Star } from "lucide-react";
import * as React from "react";

const useIsomorphicLayoutEffect =
    typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function useDirection() {
    return "ltr" as Direction;
}

function useLazyRef<T>(fn: () => T) {
    const ref = React.useRef<T | null>(null);

    if (ref.current === null) {
        ref.current = fn();
    }

    return ref as React.RefObject<T>;
}

function useAsRef<T>(props: T) {
    const ref = React.useRef<T>(props);

    useIsomorphicLayoutEffect(() => {
        ref.current = props;
    });

    return ref;
}

type InputValue = string[] | string;

interface VisuallyHiddenInputProps<T = InputValue>
    extends Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "value" | "checked" | "onReset"
    > {
    bubbles?: boolean;
    checked?: boolean;
    control: HTMLElement | null;
    value?: T;
}

function VisuallyHiddenInput<T = InputValue>(
    props: VisuallyHiddenInputProps<T>
) {
    const {
        control,
        value,
        checked,
        bubbles = true,
        type = "hidden",
        style,
        ...inputProps
    } = props;

    const isCheckInput = React.useMemo(
        () => type === "checkbox" || type === "radio" || type === "switch",
        [type]
    );
    const inputRef = React.useRef<HTMLInputElement>(null);

    const prevValueRef = React.useRef<{
        value: T | boolean | undefined;
        previous: T | boolean | undefined;
    }>({
        previous: isCheckInput ? checked : value,
        value: isCheckInput ? checked : value,
    });

    const prevValue = React.useMemo(() => {
        const currentValue = isCheckInput ? checked : value;
        if (prevValueRef.current.value !== currentValue) {
            prevValueRef.current.previous = prevValueRef.current.value;
            prevValueRef.current.value = currentValue;
        }
        return prevValueRef.current.previous;
    }, [isCheckInput, value, checked]);

    const [controlSize, setControlSize] = React.useState<{
        width?: number;
        height?: number;
    }>({});

    React.useLayoutEffect(() => {
        if (!control) {
            setControlSize({});
            return;
        }

        setControlSize({
            height: control.offsetHeight,
            width: control.offsetWidth,
        });

        if (typeof window === "undefined") {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            if (!(Array.isArray(entries) && entries.length)) {
                return;
            }

            const entry = entries[0];
            if (!entry) {
                return;
            }

            let width: number;
            let height: number;

            if ("borderBoxSize" in entry) {
                const borderSizeEntry = entry.borderBoxSize;
                const borderSize = Array.isArray(borderSizeEntry)
                    ? borderSizeEntry[0]
                    : borderSizeEntry;
                width = borderSize.inlineSize;
                height = borderSize.blockSize;
            } else {
                width = control.offsetWidth;
                height = control.offsetHeight;
            }

            setControlSize({ height, width });
        });

        resizeObserver.observe(control, { box: "border-box" });
        return () => {
            resizeObserver.disconnect();
        };
    }, [control]);

    React.useEffect(() => {
        const input = inputRef.current;
        if (!input) {
            return;
        }

        const inputProto = window.HTMLInputElement.prototype;
        const propertyKey = isCheckInput ? "checked" : "value";
        const eventType = isCheckInput ? "click" : "input";
        const currentValue = isCheckInput ? checked : value;

        let serializedCurrentValue: T | string | boolean | undefined = value;

        if (isCheckInput) {
            serializedCurrentValue = checked;
        } else if (typeof value === "object" && value !== null) {
            serializedCurrentValue = JSON.stringify(value);
        }

        const descriptor = Object.getOwnPropertyDescriptor(
            inputProto,
            propertyKey
        );

        const setter = descriptor?.set;

        if (prevValue !== currentValue && setter) {
            const event = new Event(eventType, { bubbles });
            setter.call(input, serializedCurrentValue);
            input.dispatchEvent(event);
        }
    }, [prevValue, value, checked, bubbles, isCheckInput]);

    const composedStyle = React.useMemo<React.CSSProperties>(
        () => ({
            ...style,
            ...(controlSize.width !== undefined &&
            controlSize.height !== undefined
                ? controlSize
                : {}),
            border: 0,
            clip: "rect(0 0 0 0)",
            clipPath: "inset(50%)",
            height: "1px",
            margin: "-1px",
            overflow: "hidden",
            padding: 0,
            position: "absolute",
            whiteSpace: "nowrap",
            width: "1px",
        }),
        [style, controlSize]
    );

    return (
        <input
            type={type}
            {...inputProps}
            aria-hidden={isCheckInput}
            defaultChecked={isCheckInput ? checked : undefined}
            ref={inputRef}
            style={composedStyle}
            tabIndex={-1}
        />
    );
}

type Direction = "ltr" | "rtl";
type Orientation = "horizontal" | "vertical";
type ActivationMode = "automatic" | "manual";
type Size = "default" | "sm" | "lg";
type Step = 0.5 | 1;
type DataState = "full" | "partial" | "empty";
type FocusIntent = "first" | "last" | "prev" | "next";

type RootElement = HTMLDivElement;
type ItemElement = HTMLButtonElement;

const ROOT_NAME = "Rating";
const ITEM_NAME = "RatingItem";

const ENTRY_FOCUS = "ratingFocusGroup.onEntryFocus";
const EVENT_OPTIONS = { bubbles: false, cancelable: true };

function getItemId(id: string, value: number) {
    return `${id}-item-${value}`;
}

function getPartialFillGradientId(id: string, step: Step) {
    return `partial-fill-gradient-${id}-${step}`;
}

const MAP_KEY_TO_FOCUS_INTENT: Record<string, FocusIntent> = {
    ArrowDown: "next",
    ArrowLeft: "prev",
    ArrowRight: "next",
    ArrowUp: "prev",
    End: "last",
    Home: "first",
};

function getDirectionAwareKey(key: string, dir?: Direction) {
    if (dir !== "rtl") {
        return key;
    }
    if (key === "ArrowLeft") {
        return "ArrowRight";
    }
    if (key === "ArrowRight") {
        return "ArrowLeft";
    }
    return key;
}

function getFocusIntent(
    event: React.KeyboardEvent<ItemElement>,
    dir?: Direction,
    orientation?: Orientation
) {
    const key = getDirectionAwareKey(event.key, dir);
    if (
        orientation === "horizontal" &&
        ["ArrowUp", "ArrowDown"].includes(key)
    ) {
        return;
    }
    if (
        orientation === "vertical" &&
        ["ArrowLeft", "ArrowRight"].includes(key)
    ) {
        return;
    }
    return MAP_KEY_TO_FOCUS_INTENT[key];
}

function focusFirst(
    candidates: React.RefObject<ItemElement | null>[],
    preventScroll = false
) {
    const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
    for (const candidateRef of candidates) {
        const candidate = candidateRef.current;
        if (!candidate) {
            continue;
        }
        if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) {
            return;
        }
        candidate.focus({ preventScroll });
        if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) {
            return;
        }
    }
}

interface StoreState {
    hoveredValue: number | null;
    value: number;
}

interface Store {
    getState: () => StoreState;
    notify: () => void;
    setState: <K extends keyof StoreState>(
        key: K,
        value: StoreState[K]
    ) => void;
    subscribe: (callback: () => void) => () => void;
}

const StoreContext = React.createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
    const context = React.useContext(StoreContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`${ROOT_NAME}\``
        );
    }
    return context;
}

function useStore<T>(
    selector: (state: StoreState) => T,
    ogStore?: Store | null
): T {
    const contextStore = React.useContext(StoreContext);

    const store = ogStore ?? contextStore;

    if (!store) {
        throw new Error(`\`useStore\` must be used within \`${ROOT_NAME}\``);
    }

    const getSnapshot = React.useCallback(
        () => selector(store.getState()),
        [store, selector]
    );

    return React.useSyncExternalStore(
        store.subscribe,
        getSnapshot,
        getSnapshot
    );
}

interface ItemData {
    disabled: boolean;
    id: string;
    ref: React.RefObject<ItemElement | null>;
    value: number;
}

interface RatingContextValue {
    activationMode: ActivationMode;
    clearable: boolean;
    dir: Direction;
    disabled: boolean;
    getAutoIndex: (instanceId: string) => number;
    max: number;
    orientation: Orientation;
    readOnly: boolean;
    rootId: string;
    size: Size;
    step: Step;
}

const RatingContext = React.createContext<RatingContextValue | null>(null);

function useRatingContext(consumerName: string) {
    const context = React.useContext(RatingContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`${ROOT_NAME}\``
        );
    }
    return context;
}

interface FocusContextValue {
    getItems: () => ItemData[];
    onFocusableItemAdd: () => void;
    onFocusableItemRemove: () => void;
    onItemFocus: (tabStopId: string) => void;
    onItemRegister: (item: ItemData) => void;
    onItemShiftTab: () => void;
    onItemUnregister: (id: string) => void;
    tabStopId: string | null;
}

const FocusContext = React.createContext<FocusContextValue | null>(null);

function useFocusContext(consumerName: string) {
    const context = React.useContext(FocusContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`FocusProvider\``
        );
    }
    return context;
}

interface RatingProps
    extends React.ComponentProps<"div">,
        useRender.ComponentProps<"div"> {
    activationMode?: ActivationMode;
    clearable?: boolean;
    defaultValue?: number;
    dir?: Direction;
    disabled?: boolean;
    max?: number;
    name?: string;
    onHover?: (value: number | null) => void;
    onValueChange?: (value: number) => void;
    orientation?: Orientation;
    readOnly?: boolean;
    required?: boolean;
    size?: Size;
    step?: Step;
    value?: number;
}

/**
 * @usage
 * ```
 * <Rating defaultValue={3} value={rating} onValueChange={setRating}>
 *   {Array.from({ length: 5 }, (_, i) => (
 *     <RatingItem key={i} />
 *   ))}
 * </Rating>
 * ```
 */
function Rating(props: RatingProps) {
    const {
        value: valueProp,
        defaultValue = 0,
        onValueChange,
        onHover,
        onFocus: onFocusProp,
        onBlur: onBlurProp,
        onMouseDown: onMouseDownProp,
        dir: dirProp,
        orientation = "horizontal",
        activationMode = "automatic",
        size = "default",
        max = 5,
        step = 1,
        clearable = false,
        render,
        disabled = false,
        readOnly = false,
        required = false,
        className,
        id,
        name,
        ref,
        ...rootProps
    } = props;

    const contextDir = useDirection();
    const dir = dirProp ?? contextDir;

    const instanceId = React.useId();
    const rootId = id ?? instanceId;

    const listenersRef = useLazyRef(() => new Set<() => void>());
    const stateRef = useLazyRef<StoreState>(() => ({
        hoveredValue: null,
        value: valueProp ?? defaultValue,
    }));

    const propsRef = useAsRef({
        onBlur: onBlurProp,
        onFocus: onFocusProp,
        onHover,
        onMouseDown: onMouseDownProp,
        onValueChange,
        step,
    });

    const store = React.useMemo<Store>(
        () => ({
            getState: () => stateRef.current,
            notify: () => {
                for (const cb of listenersRef.current) {
                    cb();
                }
            },
            setState: (key, value) => {
                if (Object.is(stateRef.current[key], value)) {
                    return;
                }

                if (key === "value" && typeof value === "number") {
                    stateRef.current.value = value;
                    propsRef.current.onValueChange?.(value);
                } else if (key === "hoveredValue") {
                    stateRef.current.hoveredValue = value as number | null;
                    propsRef.current.onHover?.(value as number | null);
                } else {
                    stateRef.current[key] = value;
                }

                store.notify();
            },
            subscribe: (cb) => {
                listenersRef.current.add(cb);
                return () => listenersRef.current.delete(cb);
            },
        }),
        [listenersRef, stateRef, propsRef]
    );

    useIsomorphicLayoutEffect(() => {
        if (valueProp !== undefined) {
            store.setState("value", valueProp);
        }
    }, [valueProp]);

    const value = useStore((state) => state.value, store);

    const [formTrigger, setFormTrigger] = React.useState<RootElement | null>(
        null
    );
    const composedRef = useComposedRefs(ref, (node) => setFormTrigger(node));
    const isFormControl = formTrigger ? !!formTrigger.closest("form") : true;

    const [tabStopId, setTabStopId] = React.useState<string | null>(null);
    const [isTabbingBackOut, setIsTabbingBackOut] = React.useState(false);
    const [focusableItemCount, setFocusableItemCount] = React.useState(0);
    const isClickFocusRef = React.useRef(false);
    const itemsRef = React.useRef<Map<string, ItemData>>(new Map());

    const autoIndexMapRef = React.useRef(new Map<string, number>());
    const nextAutoIndexRef = React.useRef(0);

    const getAutoIndex = React.useCallback((instanceId: string) => {
        const existingIndex = autoIndexMapRef.current.get(instanceId);
        if (existingIndex !== undefined) {
            return existingIndex;
        }

        const newIndex = nextAutoIndexRef.current++;
        autoIndexMapRef.current.set(instanceId, newIndex);
        return newIndex;
    }, []);

    const onItemFocus = React.useCallback((tabStopId: string) => {
        setTabStopId(tabStopId);
    }, []);

    const onItemShiftTab = React.useCallback(() => {
        setIsTabbingBackOut(true);
    }, []);

    const onFocusableItemAdd = React.useCallback(() => {
        setFocusableItemCount((prevCount) => prevCount + 1);
    }, []);

    const onFocusableItemRemove = React.useCallback(() => {
        setFocusableItemCount((prevCount) => prevCount - 1);
    }, []);

    const onItemRegister = React.useCallback((item: ItemData) => {
        itemsRef.current.set(item.id, item);
    }, []);

    const onItemUnregister = React.useCallback((id: string) => {
        itemsRef.current.delete(id);
    }, []);

    const getItems = React.useCallback(
        () =>
            Array.from(itemsRef.current.values())
                .filter((item) => item.ref.current)
                .sort((a, b) => {
                    const elementA = a.ref.current;
                    const elementB = b.ref.current;
                    if (!(elementA && elementB)) {
                        return 0;
                    }
                    const position = elementA.compareDocumentPosition(elementB);
                    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
                        return -1;
                    }
                    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                        return 1;
                    }
                    return 0;
                }),
        []
    );

    const onBlur = React.useCallback(
        (event: React.FocusEvent<RootElement>) => {
            propsRef.current.onBlur?.(event);
            if (event.defaultPrevented) {
                return;
            }

            setIsTabbingBackOut(false);
        },
        [propsRef]
    );

    const onFocus = React.useCallback(
        (event: React.FocusEvent<RootElement>) => {
            propsRef.current.onFocus?.(event);
            if (event.defaultPrevented) {
                return;
            }

            const isKeyboardFocus = !isClickFocusRef.current;
            if (
                event.target === event.currentTarget &&
                isKeyboardFocus &&
                !isTabbingBackOut
            ) {
                const entryFocusEvent = new CustomEvent(
                    ENTRY_FOCUS,
                    EVENT_OPTIONS
                );
                event.currentTarget.dispatchEvent(entryFocusEvent);

                if (!entryFocusEvent.defaultPrevented) {
                    const items = Array.from(itemsRef.current.values()).filter(
                        (item) => !item.disabled
                    );
                    // For half-step ratings, find the item that represents the selected value
                    // by looking for the ceiling value (e.g., 3.5 → find item with value 4)
                    const selectedItem =
                        propsRef.current.step < 1
                            ? items.find(
                                  (item) => item.value === Math.ceil(value)
                              )
                            : items.find((item) => item.value === value);
                    const currentItem = items.find(
                        (item) => item.id === tabStopId
                    );

                    const candidateItems = [
                        selectedItem,
                        currentItem,
                        ...items,
                    ].filter(Boolean) as ItemData[];
                    const candidateRefs = candidateItems.map(
                        (item) => item.ref
                    );
                    focusFirst(candidateRefs, false);
                }
            }
            isClickFocusRef.current = false;
        },
        [propsRef, isTabbingBackOut, value, tabStopId]
    );

    const onMouseDown = React.useCallback(
        (event: React.MouseEvent<RootElement>) => {
            propsRef.current.onMouseDown?.(event);

            if (event.defaultPrevented) {
                return;
            }

            isClickFocusRef.current = true;
        },
        [propsRef]
    );

    const contextValue = React.useMemo<RatingContextValue>(
        () => ({
            activationMode,
            clearable,
            dir,
            disabled,
            getAutoIndex,
            max,
            orientation,
            readOnly,
            rootId,
            size,
            step,
        }),
        [
            rootId,
            dir,
            orientation,
            activationMode,
            disabled,
            readOnly,
            size,
            max,
            step,
            clearable,
            getAutoIndex,
        ]
    );

    const focusContextValue = React.useMemo<FocusContextValue>(
        () => ({
            getItems,
            onFocusableItemAdd,
            onFocusableItemRemove,
            onItemFocus,
            onItemRegister,
            onItemShiftTab,
            onItemUnregister,
            tabStopId,
        }),
        [
            tabStopId,
            onItemFocus,
            onItemShiftTab,
            onFocusableItemAdd,
            onFocusableItemRemove,
            onItemRegister,
            onItemUnregister,
            getItems,
        ]
    );

    const element = useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(
            {
                "aria-orientation": orientation,
                className: cn(
                    "flex gap-1 text-primary outline-none",
                    orientation === "horizontal"
                        ? "flex-row items-center"
                        : "flex-col items-start",
                    className
                ),
                dir,
                id: rootId,
                onBlur,
                onFocus,
                onMouseDown,
                ref: composedRef,
                role: "radiogroup" as React.AriaRole,
                tabIndex: isTabbingBackOut || focusableItemCount === 0 ? -1 : 0,
            },
            rootProps
        ),
        render,
        state: {
            orientation,
            slot: "rating",
            ...(disabled && { disabled: "" }),
            ...(readOnly && { readonly: "" }),
        },
    });

    return (
        <StoreContext.Provider value={store}>
            <RatingContext.Provider value={contextValue}>
                <FocusContext.Provider value={focusContextValue}>
                    {element}
                    <svg
                        aria-hidden="true"
                        height="0"
                        style={{ position: "absolute" }}
                        width="0"
                    >
                        <defs>
                            <linearGradient
                                id={getPartialFillGradientId(rootId, step)}
                            >
                                {dir === "rtl" ? (
                                    <>
                                        <stop
                                            offset="50%"
                                            stopColor="transparent"
                                        />
                                        <stop
                                            offset="50%"
                                            stopColor="currentColor"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <stop
                                            offset="50%"
                                            stopColor="currentColor"
                                        />
                                        <stop
                                            offset="50%"
                                            stopColor="transparent"
                                        />
                                    </>
                                )}
                            </linearGradient>
                        </defs>
                    </svg>
                    {isFormControl && (
                        <VisuallyHiddenInput
                            control={formTrigger}
                            disabled={disabled}
                            name={name}
                            readOnly={readOnly}
                            required={required}
                            type="hidden"
                            value={value}
                        />
                    )}
                </FocusContext.Provider>
            </RatingContext.Provider>
        </StoreContext.Provider>
    );
}

interface RatingItemProps
    extends Omit<
        React.ComponentProps<"button"> & useRender.ComponentProps<"button">,
        "children"
    > {
    children?: React.ReactNode | ((dataState: DataState) => React.ReactNode);
    index?: number;
}

function RatingItem(props: RatingItemProps) {
    const {
        index,
        render,
        onClick: onClickProp,
        onFocus: onFocusProp,
        onKeyDown: onKeyDownProp,
        onMouseDown: onMouseDownProp,
        onMouseEnter: onMouseEnterProp,
        onMouseMove: onMouseMoveProp,
        onMouseLeave: onMouseLeaveProp,
        disabled,
        className,
        children,
        style: styleProp,
        ref,
        ...itemProps
    } = props;

    const itemRef = React.useRef<ItemElement>(null);
    const composedRef = useComposedRefs(ref, itemRef);

    const context = useRatingContext(ITEM_NAME);

    const instanceId = React.useId();

    const actualIndex = React.useMemo(() => {
        if (index !== undefined) {
            return index;
        }

        return context.getAutoIndex(instanceId);
    }, [index, context, instanceId]);

    const itemValue = actualIndex + 1;
    const store = useStoreContext(ITEM_NAME);
    const focusContext = useFocusContext(ITEM_NAME);
    const value = useStore((state) => state.value);
    const hoveredValue = useStore((state) => state.hoveredValue);
    const clearable = context.clearable;
    const step = context.step;
    const activationMode = context.activationMode;

    const itemId = getItemId(context.rootId, itemValue);
    const isDisabled = context.disabled || !!disabled;
    const isReadOnly = context.readOnly;
    const isTabStop = focusContext.tabStopId === itemId;

    const displayValue = hoveredValue ?? value;
    const isFilled = displayValue >= itemValue;
    const isPartiallyFilled =
        step < 1 &&
        displayValue >= itemValue - step &&
        displayValue < itemValue;
    const isHovered = hoveredValue !== null && hoveredValue < itemValue;

    const isMouseClickRef = React.useRef(false);

    const propsRef = useAsRef({
        onClick: onClickProp,
        onFocus: onFocusProp,
        onKeyDown: onKeyDownProp,
        onMouseDown: onMouseDownProp,
        onMouseEnter: onMouseEnterProp,
        onMouseLeave: onMouseLeaveProp,
        onMouseMove: onMouseMoveProp,
    });

    useIsomorphicLayoutEffect(() => {
        focusContext.onItemRegister({
            disabled: isDisabled,
            id: itemId,
            ref: itemRef,
            value: itemValue,
        });

        if (!isDisabled) {
            focusContext.onFocusableItemAdd();
        }

        return () => {
            focusContext.onItemUnregister(itemId);
            if (!isDisabled) {
                focusContext.onFocusableItemRemove();
            }
        };
    }, [focusContext, itemId, itemValue, isDisabled]);

    const onClick = React.useCallback(
        (event: React.MouseEvent<ItemElement>) => {
            propsRef.current.onClick?.(event);
            if (event.defaultPrevented) {
                return;
            }

            if (!(isDisabled || isReadOnly)) {
                let newValue = itemValue;

                if (step < 1) {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const clickX = event.clientX - rect.left;
                    const isLeftHalf = clickX < rect.width / 2;

                    if (context.dir === "rtl") {
                        if (!isLeftHalf) {
                            newValue = itemValue - step;
                        }
                    } else if (isLeftHalf) {
                        newValue = itemValue - step;
                    }
                }

                if (clearable && value === newValue) {
                    newValue = 0;
                }

                store.setState("value", newValue);
            }
        },
        [
            isDisabled,
            isReadOnly,
            clearable,
            step,
            value,
            itemValue,
            store,
            context.dir,
            propsRef,
        ]
    );

    const onFocus = React.useCallback(
        (event: React.FocusEvent<ItemElement>) => {
            propsRef.current.onFocus?.(event);
            if (event.defaultPrevented) {
                return;
            }

            focusContext.onItemFocus(itemId);

            const isKeyboardFocus = !isMouseClickRef.current;

            if (
                !(isDisabled || isReadOnly) &&
                activationMode !== "manual" &&
                isKeyboardFocus
            ) {
                // For half-step mode, check if the current value is a half-step that belongs to this item
                // e.g., if value is 3.5 and itemValue is 4, don't change it
                const isHalfStepValue = step < 1 && value === itemValue - step;

                if (!isHalfStepValue) {
                    const newValue =
                        clearable && value === itemValue ? 0 : itemValue;
                    store.setState("value", newValue);
                }
            }

            isMouseClickRef.current = false;
        },
        [
            focusContext,
            itemId,
            activationMode,
            isDisabled,
            isReadOnly,
            clearable,
            value,
            itemValue,
            step,
            store,
            propsRef,
        ]
    );

    const onKeyDown = React.useCallback(
        (event: React.KeyboardEvent<ItemElement>) => {
            propsRef.current.onKeyDown?.(event);
            if (event.defaultPrevented) {
                return;
            }

            if (
                (event.key === "Enter" || event.key === " ") &&
                activationMode === "manual"
            ) {
                event.preventDefault();
                if (!(isDisabled || isReadOnly) && itemRef.current) {
                    itemRef.current.click();
                }
                return;
            }

            if (event.key === "Tab" && event.shiftKey) {
                focusContext.onItemShiftTab();
                return;
            }

            if (event.target !== event.currentTarget) {
                return;
            }

            const focusIntent = getFocusIntent(
                event,
                context.dir,
                context.orientation
            );

            if (focusIntent !== undefined) {
                if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.shiftKey
                ) {
                    return;
                }
                event.preventDefault();

                // For half-step mode, increment/decrement by step value instead of jumping to next item
                if (
                    step < 1 &&
                    (focusIntent === "prev" || focusIntent === "next")
                ) {
                    if (!(isDisabled || isReadOnly)) {
                        let newValue = value;

                        if (focusIntent === "next") {
                            newValue = Math.min(value + step, context.max);
                        } else {
                            newValue = Math.max(value - step, 0);
                        }

                        store.setState("value", newValue);

                        // Find and focus the item that represents this value
                        const items = focusContext
                            .getItems()
                            .filter((item) => !item.disabled);
                        const targetItem = items.find(
                            (item) => item.value === Math.ceil(newValue)
                        );
                        if (targetItem?.ref.current) {
                            queueMicrotask(() =>
                                targetItem.ref.current?.focus()
                            );
                        }
                    }
                    return;
                }

                // For full-step mode or Home/End keys, use the original navigation
                const items = focusContext
                    .getItems()
                    .filter((item) => !item.disabled);
                let candidateRefs = items.map((item) => item.ref);

                if (focusIntent === "last") {
                    candidateRefs.reverse();
                } else if (focusIntent === "prev" || focusIntent === "next") {
                    if (focusIntent === "prev") {
                        candidateRefs.reverse();
                    }
                    const currentIndex = candidateRefs.findIndex(
                        (ref) => ref.current === event.currentTarget
                    );
                    candidateRefs = candidateRefs.slice(currentIndex + 1);
                }

                queueMicrotask(() => focusFirst(candidateRefs));
            }
        },
        [
            focusContext,
            context.dir,
            context.orientation,
            activationMode,
            isDisabled,
            isReadOnly,
            step,
            value,
            context.max,
            store,
            propsRef,
        ]
    );

    const onMouseDown = React.useCallback(
        (event: React.MouseEvent<ItemElement>) => {
            propsRef.current.onMouseDown?.(event);
            if (event.defaultPrevented) {
                return;
            }

            isMouseClickRef.current = true;

            if (isDisabled) {
                event.preventDefault();
            } else {
                focusContext.onItemFocus(itemId);
            }
        },
        [focusContext, itemId, isDisabled, propsRef]
    );

    const onMouseEnter = React.useCallback(
        (event: React.MouseEvent<ItemElement>) => {
            propsRef.current.onMouseEnter?.(event);
            if (event.defaultPrevented) {
                return;
            }

            if (!(isDisabled || isReadOnly)) {
                let hoverValue = itemValue;

                if (step < 1) {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const mouseX = event.clientX - rect.left;
                    const isLeftHalf = mouseX < rect.width / 2;

                    if (context.dir === "rtl") {
                        if (!isLeftHalf) {
                            hoverValue = itemValue - step;
                        }
                    } else if (isLeftHalf) {
                        hoverValue = itemValue - step;
                    }
                }

                store.setState("hoveredValue", hoverValue);
            }
        },
        [isDisabled, isReadOnly, step, itemValue, store, context.dir, propsRef]
    );

    const onMouseLeave = React.useCallback(
        (event: React.MouseEvent<ItemElement>) => {
            propsRef.current.onMouseLeave?.(event);
            if (event.defaultPrevented) {
                return;
            }

            if (!(isDisabled || isReadOnly)) {
                store.setState("hoveredValue", null);
            }
        },
        [isDisabled, isReadOnly, store, propsRef]
    );

    const onMouseMove = React.useCallback(
        (event: React.MouseEvent<ItemElement>) => {
            propsRef.current.onMouseMove?.(event);
            if (event.defaultPrevented) {
                return;
            }

            if (!(isDisabled || isReadOnly) && step < 1) {
                const rect = event.currentTarget.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const isLeftHalf = mouseX < rect.width / 2;

                let hoverValue = itemValue;
                if (context.dir === "rtl") {
                    hoverValue = isLeftHalf ? itemValue : itemValue - step;
                } else {
                    hoverValue = isLeftHalf ? itemValue - step : itemValue;
                }

                store.setState("hoveredValue", hoverValue);
            }
        },
        [isDisabled, isReadOnly, step, itemValue, store, context.dir, propsRef]
    );

    let dataState: DataState = "empty";

    if (isFilled) {
        dataState = "full";
    } else if (isPartiallyFilled) {
        dataState = "partial";
    }

    let itemSizeClass = "size-5";

    if (context.size === "sm") {
        itemSizeClass = "size-4";
    } else if (context.size === "lg") {
        itemSizeClass = "size-6";
    }

    const resolvedChildren =
        typeof children === "function"
            ? children(dataState)
            : (children ?? <Star />);

    const element = useRender({
        defaultTagName: "button",
        props: mergeProps<"button">(
            {
                "aria-checked": isFilled,
                "aria-posinset": itemValue,
                "aria-setsize": context.max,
                children: resolvedChildren,
                className: cn(
                    "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                    "[&_svg:not([class*='size-'])]:size-full [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-colors [&_svg]:duration-200 data-[state=empty]:[&_svg]:fill-transparent data-[state=full]:[&_svg]:fill-current data-[state=partial]:[&_svg]:fill-(--partial-fill)",
                    itemSizeClass,
                    className
                ),
                disabled: isDisabled,
                id: itemId,
                onClick,
                onFocus,
                onKeyDown,
                onMouseDown,
                onMouseEnter,
                onMouseLeave,
                onMouseMove,
                ref: composedRef,
                role: "radio" as React.AriaRole,
                style: {
                    ...styleProp,
                    ...(isPartiallyFilled && {
                        "--partial-fill": `url(#${getPartialFillGradientId(context.rootId, step)})`,
                    }),
                } as React.CSSProperties,
                tabIndex: isTabStop ? 0 : -1,
                type: "button" as const,
            },
            itemProps
        ),
        render,
        state: {
            slot: "rating-item",
            state: dataState,
            ...(isDisabled && { disabled: "" }),
            ...(isReadOnly && { readonly: "" }),
            ...(isHovered && { hovered: "" }),
        },
    });

    return element;
}

export { Rating, RatingItem, useStore as useRating };
