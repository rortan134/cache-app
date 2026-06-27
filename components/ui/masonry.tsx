"use client";

import {
    Masonry as MasonicMasonry,
    type MasonryProps as MasonicMasonryProps,
} from "masonic";

export type MasonryProps<Item> = MasonicMasonryProps<Item>;

export const Masonry = MasonicMasonry;
