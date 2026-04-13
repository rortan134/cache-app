"use client";

import { cn } from "@/lib/utils";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import type * as React from "react";

export const PreviewCardCreateHandle: typeof PreviewCardPrimitive.createHandle =
    PreviewCardPrimitive.createHandle;

export const PreviewCard: typeof PreviewCardPrimitive.Root =
    PreviewCardPrimitive.Root;

export function PreviewCardTrigger(
    props: PreviewCardPrimitive.Trigger.Props
): React.ReactElement {
    return (
        <PreviewCardPrimitive.Trigger
            data-slot="preview-card-trigger"
            {...props}
        />
    );
}

export function PreviewCardPopup({
    children,
    className,
    side = "bottom",
    align = "center",
    sideOffset = 8,
    alignOffset = 0,
    positionMethod,
    anchor,
    portalProps,
    ...props
}: PreviewCardPrimitive.Popup.Props & {
    side?: PreviewCardPrimitive.Positioner.Props["side"];
    align?: PreviewCardPrimitive.Positioner.Props["align"];
    sideOffset?: PreviewCardPrimitive.Positioner.Props["sideOffset"];
    alignOffset?: PreviewCardPrimitive.Positioner.Props["alignOffset"];
    anchor?: PreviewCardPrimitive.Positioner.Props["anchor"];
    positionMethod?: PreviewCardPrimitive.Positioner.Props["positionMethod"];
    portalProps?: PreviewCardPrimitive.Portal.Props;
}): React.ReactElement {
    return (
        <PreviewCardPrimitive.Portal {...portalProps}>
            <PreviewCardPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className="z-50 transition-none"
                data-slot="preview-card-positioner"
                positionMethod={positionMethod}
                side={side}
                sideOffset={sideOffset}
            >
                <PreviewCardPrimitive.Popup
                    className={cn(
                        "relative flex w-64 origin-(--transform-origin) overflow-hidden text-balance rounded-xl bg-popover not-dark:bg-clip-padding p-4 text-popover-foreground text-sm shadow-xl/5 transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        className
                    )}
                    data-slot="preview-card-popup"
                    {...props}
                >
                    {children}
                </PreviewCardPrimitive.Popup>
            </PreviewCardPrimitive.Positioner>
        </PreviewCardPrimitive.Portal>
    );
}
