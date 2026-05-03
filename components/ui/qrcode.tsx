"use client";

import { cn } from "@/lib/common/cn";
import { mergeProps } from "@base-ui/react/merge-props";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useRender } from "@base-ui/react/use-render";
import { useRefWithInit } from "@base-ui/utils/useRefWithInit";
import * as React from "react";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-effect";

const ROOT_NAME = "QRCode";
const IMAGE_NAME = "QRCodeImage";
const CANVAS_NAME = "QRCodeCanvas";
const SVG_NAME = "QRCodeSvg";
const SKELETON_NAME = "QRCodeSkeleton";

type QRCodeLevel = "L" | "M" | "Q" | "H";

interface QRCodeCanvasOpts {
    color?: {
        dark: string;
        light: string;
    };
    errorCorrectionLevel: QRCodeLevel;
    margin?: number;
    quality?: number;
    rendererOpts?: {
        quality?: number;
    };
    type?: "image/png" | "image/jpeg" | "image/webp";
    width?: number;
}

interface StoreState {
    dataUrl: string | null;
    error: Error | null;
    generationKey: string;
    isGenerating: boolean;
    svgString: string | null;
}

interface Store {
    getState: () => StoreState;
    notify: () => void;
    setState: <K extends keyof StoreState>(
        key: K,
        value: StoreState[K]
    ) => void;
    setStates: (updates: Partial<StoreState>) => void;
    subscribe: (callback: () => void) => () => void;
}

interface QRCodeContextValue {
    backgroundColor: string;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    foregroundColor: string;
    level: QRCodeLevel;
    margin: number;
    size: number;
    value: string;
}

const StoreContext = React.createContext<Store | null>(null);

function useStore<T>(selector: (state: StoreState) => T): T {
    const store = React.use(StoreContext);
    if (!store) {
        throw new Error(`\`useQRCode\` must be used within \`${ROOT_NAME}\``);
    }

    return React.useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState())
    );
}

const QRCodeContext = React.createContext<QRCodeContextValue | null>(null);

function useQRCodeContext(consumerName: string) {
    const context = React.use(QRCodeContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`${ROOT_NAME}\``
        );
    }
    return context;
}

interface QRCodeProps extends Omit<useRender.ComponentProps<"div">, "onError"> {
    backgroundColor?: string;
    foregroundColor?: string;
    level?: QRCodeLevel;
    margin?: number;
    onError?: (error: Error) => void;
    onGenerated?: () => void;
    quality?: number;
    size?: number;
    value: string;
}

const storeStateKeys = [
    "dataUrl",
    "error",
    "generationKey",
    "isGenerating",
    "svgString",
] as const satisfies readonly (keyof StoreState)[];

function createQRCodeStore(
    stateRef: React.RefObject<StoreState>,
    listenersRef: React.RefObject<Set<() => void>>
): Store {
    const notify = () => {
        for (const listener of listenersRef.current) {
            listener();
        }
    };

    return {
        getState: () => stateRef.current,
        notify,
        setState: (key, value) => {
            if (Object.is(stateRef.current[key], value)) {
                return;
            }
            stateRef.current[key] = value;
            notify();
        },
        setStates: (updates) => {
            let hasChanged = false;

            for (const key of storeStateKeys) {
                const value = updates[key];
                if (
                    value !== undefined &&
                    !Object.is(stateRef.current[key], value)
                ) {
                    Object.assign(stateRef.current, { [key]: value });
                    hasChanged = true;
                }
            }

            if (hasChanged) {
                notify();
            }
        },
        subscribe: (listener) => {
            listenersRef.current.add(listener);
            return () => listenersRef.current.delete(listener);
        },
    };
}

/**
 * Usage
 * ```tsx
 * import { QRCode } from "@/components/ui/qr-code";
 *
 * <QRCode value="https://example.com" size={120}>
 *  <QRCodeSvg />
 *  <QRCodeDownload format="svg" filename="qr-svg" asChild>
 *    <Button size="sm">Download SVG</Button>
 *  </QRCodeDownload>
 * </QRCode>
 *
 * @see https://www.diceui.com/docs/components/base/qr-code
 */
function QRCode(props: QRCodeProps) {
    const {
        value,
        size = 200,
        level = "M",
        margin = 1,
        quality = 0.92,
        backgroundColor = "#ffffff",
        foregroundColor = "#000000",
        onError,
        onGenerated,
        className,
        style,
        render,
        ...rootProps
    } = props;

    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const listenersRef = useRefWithInit(() => new Set<() => void>());
    const stateRef = useRefWithInit<StoreState>(() => ({
        dataUrl: null,
        error: null,
        generationKey: "",
        isGenerating: false,
        svgString: null,
    }));

    const store = createQRCodeStore(stateRef, listenersRef);

    const canvasOpts: QRCodeCanvasOpts = {
        color: {
            dark: foregroundColor,
            light: backgroundColor,
        },
        errorCorrectionLevel: level,
        margin,
        quality,
        type: "image/png",
        width: size,
    };

    const generationKey = value
        ? JSON.stringify({
              backgroundColor,
              foregroundColor,
              level,
              margin,
              quality,
              size,
              value,
          })
        : "";

    async function onQRCodeGenerate(targetGenerationKey: string) {
        if (!(value && targetGenerationKey)) {
            return;
        }

        const currentState = store.getState();
        if (
            currentState.isGenerating ||
            currentState.generationKey === targetGenerationKey
        ) {
            return;
        }

        store.setStates({
            error: null,
            isGenerating: true,
        });

        try {
            const QRCode = (await import("qrcode")).default;

            let dataUrl: string | null = null;

            try {
                dataUrl = await QRCode.toDataURL(value, canvasOpts);
            } catch {
                dataUrl = null;
            }

            if (canvasRef.current) {
                await QRCode.toCanvas(canvasRef.current, value, canvasOpts);
            }

            const svgString = await QRCode.toString(value, {
                color: canvasOpts.color,
                errorCorrectionLevel: canvasOpts.errorCorrectionLevel,
                margin: canvasOpts.margin,
                type: "svg",
                width: canvasOpts.width,
            });

            store.setStates({
                dataUrl,
                generationKey: targetGenerationKey,
                isGenerating: false,
                svgString,
            });

            onGenerated?.();
        } catch (error) {
            const parsedError =
                error instanceof Error
                    ? error
                    : new Error("Failed to generate QR code");
            store.setStates({
                error: parsedError,
                isGenerating: false,
            });
            onError?.(parsedError);
        }
    }

    const contextValue: QRCodeContextValue = {
        backgroundColor,
        canvasRef,
        foregroundColor,
        level,
        margin,
        size,
        value,
    };

    useIsomorphicLayoutEffect(() => {
        if (generationKey) {
            const rafId = requestAnimationFrame(() => {
                onQRCodeGenerate(generationKey);
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [generationKey, onQRCodeGenerate]);

    const element = useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(
            {
                className: cn(
                    "relative flex flex-col items-center gap-2",
                    className
                ),
                style: {
                    "--qr-code-size": `${size}px`,
                    ...style,
                } as React.CSSProperties,
            },
            rootProps
        ),
        render,
        state: { slot: "qr-code" },
    });

    return (
        <StoreContext.Provider value={store}>
            <QRCodeContext.Provider value={contextValue}>
                {element}
            </QRCodeContext.Provider>
        </StoreContext.Provider>
    );
}

interface QRCodeCanvasProps
    extends React.ComponentProps<"canvas">,
        useRender.ComponentProps<"canvas"> {}

function QRCodeCanvas({
    render,
    className,
    ref,
    ...canvasProps
}: QRCodeCanvasProps) {
    const context = useQRCodeContext(CANVAS_NAME);
    const generationKey = useStore((state) => state.generationKey);

    const composedRef = useMergedRefs(ref, context.canvasRef);

    return useRender({
        defaultTagName: "canvas",
        props: mergeProps<"canvas">(
            {
                className: cn(
                    "relative max-h-(--qr-code-size) max-w-(--qr-code-size)",
                    !generationKey && "invisible",
                    className
                ),
                height: context.size,
                ref: composedRef,
                width: context.size,
            },
            canvasProps
        ),
        render,
        state: { slot: "qr-code-canvas" },
    });
}

interface QRCodeSvgProps
    extends React.ComponentProps<"div">,
        useRender.ComponentProps<"div"> {}

function QRCodeSvg({ render, className, style, ...svgProps }: QRCodeSvgProps) {
    const context = useQRCodeContext(SVG_NAME);
    const svgString = useStore((state) => state.svgString);

    const element = useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(
            {
                className: cn(
                    "relative max-h-(--qr-code-size) max-w-(--qr-code-size)",
                    className
                ),
                dangerouslySetInnerHTML: svgString
                    ? { __html: svgString }
                    : undefined,
                style: { height: context.size, width: context.size, ...style },
            },
            svgProps
        ),
        render,
        state: { slot: "qr-code-svg" },
    });

    if (!svgString) {
        return null;
    }

    return element;
}

interface QRCodeImageProps
    extends React.ComponentProps<"img">,
        useRender.ComponentProps<"img"> {
    alt?: string;
}

function QRCodeImage({
    alt = "QR Code",
    render,
    className,
    ...imageProps
}: QRCodeImageProps) {
    const context = useQRCodeContext(IMAGE_NAME);
    const dataUrl = useStore((state) => state.dataUrl);

    const element = useRender({
        defaultTagName: "img",
        props: mergeProps<"img">(
            {
                alt,
                className: cn(
                    "relative max-h-(--qr-code-size) max-w-(--qr-code-size)",
                    className
                ),
                height: context.size,
                src: dataUrl ?? undefined,
                width: context.size,
            },
            imageProps
        ),
        render,
        state: { slot: "qr-code-image" },
    });

    if (!dataUrl) {
        return null;
    }

    return element;
}

interface QRCodeDownloadProps
    extends React.ComponentProps<"button">,
        useRender.ComponentProps<"button"> {
    filename?: string;
    format?: "png" | "svg";
}

function QRCodeDownload(props: QRCodeDownloadProps) {
    const {
        filename = "qrcode",
        format = "png",
        render,
        className,
        children,
        ...buttonProps
    } = props;

    const dataUrl = useStore((state) => state.dataUrl);
    const svgString = useStore((state) => state.svgString);

    function onClick(event: React.MouseEvent<HTMLButtonElement>) {
        buttonProps.onClick?.(event);
        if (event.defaultPrevented) {
            return;
        }

        const link = document.createElement("a");

        if (format === "png" && dataUrl) {
            link.href = dataUrl;
            link.download = `${filename}.png`;
        } else if (format === "svg" && svgString) {
            const blob = new Blob([svgString], { type: "image/svg+xml" });
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.svg`;
        } else {
            return;
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (format === "svg" && svgString) {
            URL.revokeObjectURL(link.href);
        }
    }

    return useRender({
        defaultTagName: "button",
        props: mergeProps<"button">(
            {
                children: children ?? `Download ${format.toUpperCase()}`,
                className: cn("max-w-(--qr-code-size)", className),
                onClick,
                type: "button",
            },
            buttonProps
        ),
        render,
        state: { slot: "qr-code-download" },
    });
}

interface QRCodeOverlayProps
    extends React.ComponentProps<"div">,
        useRender.ComponentProps<"div"> {}

function QRCodeOverlay({
    render,
    className,
    ...overlayProps
}: QRCodeOverlayProps) {
    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(
            {
                className: cn(
                    "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-background",
                    className
                ),
            },
            overlayProps
        ),
        render,
        state: { slot: "qr-code-overlay" },
    });
}

interface QRCodeSkeletonProps
    extends React.ComponentProps<"div">,
        useRender.ComponentProps<"div"> {}

function QRCodeSkeleton({
    render,
    className,
    style,
    ...skeletonProps
}: QRCodeSkeletonProps) {
    const context = useQRCodeContext(SKELETON_NAME);
    const dataUrl = useStore((state) => state.dataUrl);
    const svgString = useStore((state) => state.svgString);
    const generationKey = useStore((state) => state.generationKey);

    const isLoaded = dataUrl || svgString || generationKey;

    const element = useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(
            {
                className: cn(
                    "absolute max-h-(--qr-code-size) max-w-(--qr-code-size) animate-pulse bg-accent",
                    className
                ),
                style: {
                    height: context.size,
                    width: context.size,
                    ...style,
                },
            },
            skeletonProps
        ),
        render,
        state: { slot: "qr-code-skeleton" },
    });

    if (isLoaded) {
        return null;
    }

    return element;
}

export {
    QRCode,
    QRCodeCanvas,
    QRCodeDownload,
    QRCodeImage,
    QRCodeOverlay,
    QRCodeSkeleton,
    QRCodeSvg,
    useStore as useQRCode,
    type QRCodeProps,
};
