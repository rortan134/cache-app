import { converter, formatHex, parse } from "culori";
import * as z from "zod";

export const colors: readonly string[] = [
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
        const parsed = parse(color);
        return parsed !== null && parsed !== undefined;
    } catch {
        return false;
    }
};

export const parseValidColor = (color: string) => {
    const parsed = parse(color);
    if (!parsed) {
        throw new Error(`Invalid color format: ${color}`);
    }
    return parsed;
};

export const toHexCode = (color: string): string => {
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

export const toRgb = (color: string) => {
    const parsed = parse(color);
    if (!parsed) {
        throw new Error(`Invalid color format: ${color}`);
    }
    return converter("rgb")(parsed);
};

export const getColorFormats = (color: string) => {
    const parsed = parse(color);
    if (!parsed) {
        throw new Error(`Invalid color format: ${color}`);
    }

    return {
        hex: formatHex(parsed),
        original: parsed,
        rgb: converter("rgb")(parsed),
    };
};

/**
 * Generates a hash for a given string using the DJB2 algorithm.
 * @param value - The string to hash.
 * @returns A non-negative hash value.
 */
function customHash(value: string): number {
    let hash = 5381;
    const len = value.length;
    for (let i = 0; i < len; i += 1) {
        hash = (hash << 5) + hash + value.charCodeAt(i); // hash * 33 + char code
    }
    return Math.abs(hash);
}

/**
 * Computes an index for a color based on a given string.
 * @param value - The input string.
 * @param arrayLength - The length of the color array.
 * @returns An index within the array range.
 */
export function getColor(value: string, arrayLength: number): number {
    const hashValue = customHash(value);
    return hashValue % arrayLength;
}

/**
 * Retrieves a color from the colors array based on a given name.
 * @param name - The name from which to derive the color.
 * @returns A color string from the colors array.
 */
export function getColorFromName(name: string): string {
    const index = getColor(name, colors.length);
    const color = colors[index];
    if (color === undefined || color === null) {
        throw new Error(`Color at index ${index} is undefined`);
    }
    return color;
}

/**
 * Retrieves a random color from the colors array.
 * @returns A random color string.
 */
export function getRandomColor(): string {
    const randomIndex = Math.floor(Math.random() * colors.length);
    const color = colors[randomIndex];
    if (color === undefined || color === null) {
        throw new Error(`Color at index ${randomIndex} is undefined`);
    }
    return color;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function rgbToHue(r: number, g: number, b: number): number {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    if (delta === 0) {
        return 272;
    }

    let hue = 0;
    if (max === rn) {
        hue = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
        hue = (bn - rn) / delta + 2;
    } else {
        hue = (rn - gn) / delta + 4;
    }

    return (hue * 60 + 360) % 360;
}

export function getSubtleColorGradientFromName(name: string): string {
    const rgb = hexToRgb(getColorFromName(name));
    const hue = rgb ? rgbToHue(rgb[0], rgb[1], rgb[2]) : 272;
    const chromaBias = rgb
        ? clamp((Math.max(...rgb) - Math.min(...rgb)) / 255, 0.6, 2.2)
        : 1;
    const start = `lch(97 ${Number((2.4 + chromaBias * 0.7).toFixed(3))} ${Number(hue.toFixed(3))})`;
    const end = `lch(97 ${Number((0.8 + chromaBias * 0.2).toFixed(3))} ${Number(((hue + 10) % 360).toFixed(3))})`;

    return `linear-gradient(90deg, ${start} 0%, ${end} 100%), ${end}`;
}

export const normalizeHexCode = (hex: string): string => {
    if (!hex) {
        return "";
    }
    let value = hex.trim().toLowerCase();
    if (!value.startsWith("#")) {
        value = `#${value}`;
    }
    // expand shorthand #abc -> #aabbcc
    if (value.length === 4) {
        const r = value[1] ?? "0";
        const g = value[2] ?? "0";
        const b = value[3] ?? "0";
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    // ensure #rrggbb
    if (value.length === 7) {
        return value;
    }
    return value;
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

export const hexToRgb = (hexCode: string): [number, number, number] | null => {
    const value = normalizeHexCode(hexCode);
    if (!HEX_COLOR_REGEX.test(value)) {
        return null;
    }
    const r = Number.parseInt(value.slice(1, 3), 16);
    const g = Number.parseInt(value.slice(3, 5), 16);
    const b = Number.parseInt(value.slice(5, 7), 16);
    return [r, g, b];
};

export const euclideanRgbDistance = (
    sourceHexColor: string,
    targetHexColor: string
): number => {
    const sourceRgb = hexToRgb(sourceHexColor);
    const targetRgb = hexToRgb(targetHexColor);
    if (sourceRgb === null) {
        return normalizeHexCode(sourceHexColor) ===
            normalizeHexCode(targetHexColor)
            ? 0
            : Number.POSITIVE_INFINITY;
    }
    if (targetRgb === null) {
        return normalizeHexCode(sourceHexColor) ===
            normalizeHexCode(targetHexColor)
            ? 0
            : Number.POSITIVE_INFINITY;
    }
    const dr = sourceRgb[0] - targetRgb[0];
    const dg = sourceRgb[1] - targetRgb[1];
    const db = sourceRgb[2] - targetRgb[2];

    return Math.sqrt(dr * dr + dg * dg + db * db);
};

export const ColorSchema = z
    .string()
    .min(1, "Color cannot be empty")
    .refine(isValidColor, {
        message:
            "Invalid color format. Supported formats: hex (#RGB, #RRGGBB), named colors (red, blue), rgb/rgba, hsl/hsla, etc.",
    })
    .overwrite(toHexCode);

/**
 * Calculates a contrasting text color based on the luminance of the background.
 * It converts the hex background color to RGB values, computes the brightness,
 * and returns white (#FFFFFF) for dark backgrounds or black (#000000) for light ones.
 * @param background - A hex string representing the background color (#RRGGBB).
 * @returns A contrasting text color (#FFFFFF or #000000).
 */
export const getContrastColor = (background: string) => {
    const r = Number.parseInt(background.slice(1, 3), 16) / 255;
    const g = Number.parseInt(background.slice(3, 5), 16) / 255;
    const b = Number.parseInt(background.slice(5, 7), 16) / 255;

    return (Math.min(r, g, b) + Math.max(r, g, b)) / 2 < 0.55
        ? "#FFFFFF"
        : "#000000";
};
