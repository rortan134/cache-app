"use client";

import {
    Masonry as MasonicMasonry,
    type MasonryProps as MasonicMasonryProps,
    type RenderComponentProps as MasonicRenderComponentProps,
} from "masonic";

export type MasonryProps<Item> = MasonicMasonryProps<Item>;
export type RenderComponentProps<Item> = MasonicRenderComponentProps<Item>;

export const Masonry = MasonicMasonry;
