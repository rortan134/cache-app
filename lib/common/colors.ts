import { clamp } from "@/lib/common/numbers";
import { converter, formatHex, parse } from "culori";
import * as z from "zod";

const COLORS: readonly string[] = [
    "#FF6900", // Orange
    "#FCB900", // Yellow
    "#00D084", // Emerald
    "#8ED1FC", // Sky Blue
    "#0693E3", // Blue
    "#ABB8C3", // Gray
    "#EB144C", // Red
    "#F78DA7", // Pink
    "#9900EF", // Purple
    "#0079BF", // Dark Blue
    "#B6BBBF", // Light Gray
    "#FF5A5F", // Coral
    "#F7C59F", // Peach
    "#8492A6", // Slate
    "#4D5055", // Charcoal
    "#AF5A50", // Terracotta
    "#F9D6E7", // Pale Pink
    "#B5EAEA", // Pale Cyan
    "#B388EB", // Lavender
    "#B04632", // Rust
    "#FF78CB", // Pink
    "#4E5A65", // Gray
    "#01FF70", // Lime
    "#85144b", // Pink
    "#F012BE", // Purple
    "#7FDBFF", // Sky Blue
    "#3D9970", // Olive
    "#AAAAAA", // Silver
    "#111111", // Black
    "#0074D9", // Blue
    "#39CCCC", // Teal
    "#001f3f", // Navy
    "#FF9F1C", // Orange
    "#5E6A71", // Ash
    "#75D701", // Neon Green
    "#B6C8A9", // Lichen
    "#00A9FE", // Electric Blue
    "#EAE8E1", // Bone
    "#CD346C", // Raspberry
    "#FF6FA4", // Pink Sherbet
    "#D667FB", // Purple Mountain Majesty
    "#0080FF", // Azure
    "#656D78", // Dim Gray
    "#F8842C", // Tangerine
    "#FF8CFF", // Carnation Pink
    "#647F6A", // Feldgrau
    "#5E574E", // Field Drab
    "#EF5466", // KU Crimson
    "#B0E0E6", // Powder Blue
    "#EB5E7C", // Rose Pink
    "#8A2BE2", // Blue Violet
    "#6B7C85", // Slate Gray
    "#8C92AC", // Lavender Blue
    "#6C587A", // Eminence
    "#52A1FF", // Azureish White
    "#32CD32", // Lime Green
    "#E04F9F", // Orchid Pink
    "#915C83", // Lilac Bush
    "#4C6B88", // Air Force Blue
    "#587376", // Cadet Blue
    "#C46210", // Buff
    "#65B0D0", // Columbia Blue
    "#2F4F4F", // Dark Slate Gray
    "#528B8B", // Dark Cyan
    "#8B4513", // Saddle Brown
    "#4682B4", // Steel Blue
    "#CD853F", // Peru
    "#FFA07A", // Light Salmon
    "#CD5C5C", // Indian Red
    "#483D8B", // Dark Slate Blue
    "#696969", // Dim Gray
];

export const isValidColor = (color: string): boolean => {
    try {
        return parse(color) != null;
    } catch {
        return false;
    }
};

export const parseToValidColor = (color: string) => {
    const parsed = parse(color);
    if (!parsed) {
        throw new Error(`Invalid color format: ${color}`);
    }
    return parsed;
};

export const parseToHex = (color: string): string => {
    try {
        const parsed = parse(color);
        if (!parsed) {
            throw new Error(`Invalid color: ${color}`);
        }
        return formatHex(parsed);
    } catch (error) {
        throw new Error(
            `Failed to normalize color "${color}": ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
};

export const parseToRgb = (color: string) => {
    const parsed = parse(color);
    if (!parsed) {
        throw new Error(`Invalid color format: ${color}`);
    }
    return converter("rgb")(parsed);
};

const DJB2_HASH_INIT = 5381;
const RGB_MAX = 255;
const HUE_DEFAULT = 272;
const HUE_SECTOR_DEGREES = 60;
const HUE_FULL_CIRCLE = 360;
const LUMINANCE_THRESHOLD = 0.55;

const GRADIENT_CHROMA_CLAMP_MIN = 0.6;
const GRADIENT_CHROMA_CLAMP_MAX = 2.2;
const GRADIENT_START_CHROMA = 2.4;
const GRADIENT_START_CHROMA_BIAS = 0.7;
const GRADIENT_END_CHROMA = 0.8;
const GRADIENT_END_CHROMA_BIAS = 0.2;
const GRADIENT_LIGHTNESS = 97;
const GRADIENT_HUE_OFFSET = 10;
const GRADIENT_ANGLE = "90deg";

/**
 * Generates a hash for a given string using the DJB2 algorithm.
 * @param value - The string to hash.
 * @returns A non-negative hash value.
 * @internal
 */
export function djb2Hash(value: string): number {
    let hash = DJB2_HASH_INIT;
    const len = value.length;
    for (let i = 0; i < len; i++) {
        hash = (hash << 5) + hash + value.charCodeAt(i);
        hash |= 0; // Convert to unsigned 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Computes an index for a color based on a given string.
 * @param value - The input string.
 * @param arrayLength - The length of the color array.
 * @returns An index within the array range.
 * @internal
 */
function getColorIndex(value: string, arrayLength: number): number {
    const hashValue = djb2Hash(value);
    return hashValue % arrayLength;
}

/**
 * Retrieves a color from the colors array based on a given name.
 * @param value - The name from which to derive the color.
 * @returns A color string from the colors array.
 */
export function getHexColorFromName(value: string): string {
    const index = getColorIndex(value, COLORS.length);
    const color = COLORS[index];
    if (!color) {
        throw new Error(
            `Invariant violated: no color at computed index ${index}`
        );
    }
    return color;
}

/**
 * Retrieves a random color from the colors array.
 * @returns A random color string.
 */
export function getRandomHexColor(): string {
    const randomIndex = Math.floor(Math.random() * COLORS.length);
    const color = COLORS[randomIndex];
    if (!color) {
        throw new Error(
            `Invariant violated: no color at computed index ${randomIndex}`
        );
    }
    return color;
}

export function rgbToHue(r: number, g: number, b: number): number {
    const rn = r / RGB_MAX;
    const gn = g / RGB_MAX;
    const bn = b / RGB_MAX;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    if (delta === 0) {
        return HUE_DEFAULT;
    }

    let hue = 0;
    if (max === rn) {
        hue = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
        hue = (bn - rn) / delta + 2;
    } else {
        hue = (rn - gn) / delta + 4;
    }

    return (hue * HUE_SECTOR_DEGREES + HUE_FULL_CIRCLE) % HUE_FULL_CIRCLE;
}

export function getColorGradientFromName(name: string): string {
    const color = parseToRgb(getHexColorFromName(name));
    const rgb = [color.r, color.g, color.b] as const;
    const hue = rgbToHue(rgb[0], rgb[1], rgb[2]);
    const chromaBias = clamp(
        (Math.max(...rgb) - Math.min(...rgb)) / RGB_MAX,
        GRADIENT_CHROMA_CLAMP_MIN,
        GRADIENT_CHROMA_CLAMP_MAX
    );
    const start = `lch(${GRADIENT_LIGHTNESS} ${Number((GRADIENT_START_CHROMA + chromaBias * GRADIENT_START_CHROMA_BIAS).toFixed(3))} ${Number(hue.toFixed(3))})`;
    const end = `lch(${GRADIENT_LIGHTNESS} ${Number((GRADIENT_END_CHROMA + chromaBias * GRADIENT_END_CHROMA_BIAS).toFixed(3))} ${Number(((hue + GRADIENT_HUE_OFFSET) % HUE_FULL_CIRCLE).toFixed(3))})`;
    return `linear-gradient(${GRADIENT_ANGLE}, ${start} 0%, ${end} 100%), ${end}`;
}

/**
 * Calculates a contrasting text color based on the luminance of the background.
 * It converts the hex background color to RGB values, computes the brightness,
 * and returns white (#FFFFFF) for dark backgrounds or black (#000000) for light ones.
 * @param hexColor - A hex string representing the background color (#RRGGBB).
 * @returns A contrasting text color (#FFFFFF or #000000).
 */
export const getContrastColor = (hexColor: string) => {
    const r = Number.parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = Number.parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = Number.parseInt(hexColor.slice(5, 7), 16) / 255;
    return (Math.min(r, g, b) + Math.max(r, g, b)) / 2 < LUMINANCE_THRESHOLD
        ? "#FFFFFF"
        : "#000000";
};

export const ColorSchema = z
    .string()
    .min(1, "Color cannot be empty")
    .refine(isValidColor, {
        message:
            "Invalid color format. Supported formats: hex (#RGB, #RRGGBB), named colors (red, blue), rgb/rgba, hsl/hsla, etc.",
    })
    .overwrite(parseToHex);
