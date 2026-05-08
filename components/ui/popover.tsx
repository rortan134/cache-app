"use client";

import { cn } from "@/lib/common/cn";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

export const PopoverCreateHandle: typeof PopoverPrimitive.createHandle =
    PopoverPrimitive.createHandle;

export const Popover: typeof PopoverPrimitive.Root = PopoverPrimitive.Root;

export function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
    return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export function PopoverPopup({
    children,
    className,
    side = "bottom",
    align = "center",
    sideOffset = 4,
    alignOffset = 0,
    tooltipStyle = false,
    positionMethod,
    anchor,
    positionerClassname,
    ...props
}: PopoverPrimitive.Popup.Props & {
    side?: PopoverPrimitive.Positioner.Props["side"];
    align?: PopoverPrimitive.Positioner.Props["align"];
    sideOffset?: PopoverPrimitive.Positioner.Props["sideOffset"];
    alignOffset?: PopoverPrimitive.Positioner.Props["alignOffset"];
    tooltipStyle?: boolean;
    anchor?: PopoverPrimitive.Positioner.Props["anchor"];
    positionMethod?: PopoverPrimitive.Positioner.Props["positionMethod"];
    positionerClassname?: string;
}) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                anchor={anchor}
                className={cn(
                    "z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom,transform] data-instant:transition-none",
                    positionerClassname
                )}
                data-slot="popover-positioner"
                positionMethod={positionMethod}
                side={side}
                sideOffset={sideOffset}
            >
                <PopoverPrimitive.Popup
                    className={cn(
                        "relative flex h-(--popup-height,auto) w-(--popup-width,auto) origin-(--transform-origin) overflow-clip rounded-xl border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 outline-none transition-[width,height,scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] has-data-[slot=calendar]:rounded-xl has-data-[slot=calendar]:before:rounded-[calc(var(--radius-xl)-1px)] data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
                        tooltipStyle &&
                            "w-fit text-balance rounded-lg text-xs shadow-md/5 before:rounded-[calc(var(--radius-lg)-1px)]",
                        className
                    )}
                    data-slot="popover-popup"
                    {...props}
                >
                    <PopoverPrimitive.Viewport
                        className={cn(
                            "relative size-full max-h-(--available-height) overflow-clip px-(--viewport-inline-padding) py-4 [--viewport-inline-padding:--spacing(4)] has-data-[slot=calendar]:p-2 data-instant:transition-none **:data-current:data-ending-style:opacity-0 **:data-current:data-starting-style:opacity-0 **:data-previous:data-ending-style:opacity-0 **:data-previous:data-starting-style:opacity-0 **:data-current:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-previous:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-current:opacity-100 **:data-previous:opacity-100 **:data-current:transition-opacity **:data-previous:transition-opacity",
                            tooltipStyle
                                ? "max-w-64 text-pretty py-1.5 [--viewport-inline-padding:--spacing(2)]"
                                : "max-w-72 not-data-transitioning:overflow-y-auto"
                        )}
                        data-slot="popover-viewport"
                    >
                        {children}
                    </PopoverPrimitive.Viewport>
                </PopoverPrimitive.Popup>
            </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
    );
}

export function PopoverClose(props: PopoverPrimitive.Close.Props) {
    return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export function PopoverTitle({
    className,
    ...props
}: PopoverPrimitive.Title.Props) {
    return (
        <PopoverPrimitive.Title
            className={cn("font-medium text-sm", className)}
            data-slot="popover-title"
            {...props}
        />
    );
}

export function PopoverDescription({
    className,
    ...props
}: PopoverPrimitive.Description.Props) {
    return (
        <PopoverPrimitive.Description
            className={cn("text-muted-foreground text-sm", className)}
            data-slot="popover-description"
            {...props}
        />
    );
}
