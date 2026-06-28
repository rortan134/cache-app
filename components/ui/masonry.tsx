"use client";

import {
    Masonry as MasonicMasonry,
    type RenderComponentProps as MasonicRenderComponentProps,
} from "masonic";

export type MasonryRenderComponentProps<Item> =
    MasonicRenderComponentProps<Item>;

export const Masonry = MasonicMasonry;
