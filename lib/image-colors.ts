import { Vibrant } from "node-vibrant/browser";

type ImageSource = Parameters<typeof Vibrant.from>[0];

export async function getImageColors(imageSource: ImageSource) {
    const vibrantBuilder = Vibrant.from(imageSource);
    const palette = await vibrantBuilder.getPalette();

    return Object.values(palette)
        .map((color) => color?.hex)
        .filter(Boolean) as string[];
}

// const deltaE = differenceCiede2000();

// export function getColorNameFromHexColor(hexColor: string) {
//     const color = ColorSchema.parse(hexColor);

//     return colorsList
//         .map((entry) => ({
//             distance: deltaE(color, entry.hex),
//             name: entry.name,
//         }))
//         .sort((a, b) => a.distance - b.distance)
//         .slice(0, 6)
//         .map((x) => x.name);
// }
