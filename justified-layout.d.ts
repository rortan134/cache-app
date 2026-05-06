declare module "justified-layout" {
    export interface JustifiedLayoutBox {
        aspectRatio: number;
        height: number;
        left: number;
        top: number;
        width: number;
    }

    export interface JustifiedLayoutResult {
        boxes: JustifiedLayoutBox[];
        containerHeight: number;
        widowCount: number;
    }

    export interface JustifiedLayoutConfig {
        boxSpacing?: number | { horizontal: number; vertical: number };
        containerPadding?:
            | number
            | { top: number; right: number; bottom: number; left: number };
        containerWidth?: number;
        forceAspectRatio?: boolean | number;
        fullWidthBreakoutRowCadence?: false | number;
        maxNumRows?: number;
        showWidows?: boolean;
        targetRowHeight?: number;
        targetRowHeightTolerance?: number;
        widowLayoutStyle?: "left" | "center" | "justify";
    }

    function justifiedLayout(
        input: Array<number | { width: number; height: number }>,
        config?: JustifiedLayoutConfig
    ): JustifiedLayoutResult;

    export default justifiedLayout;
}
