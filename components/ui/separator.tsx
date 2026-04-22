import { cn } from "@/lib/common/cn";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

function Separator({
    className,
    orientation = "horizontal",
    ...props
}: SeparatorPrimitive.Props) {
    return (
        <SeparatorPrimitive
            className={cn(
                "shrink-0 rounded-full bg-border opacity-80 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
                className
            )}
            data-slot="separator"
            orientation={orientation}
            {...props}
        />
    );
}

export { Separator };
