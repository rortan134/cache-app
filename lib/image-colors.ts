import { Vibrant } from "node-vibrant/browser";

type ImageSource = Parameters<typeof Vibrant.from>[0];

export async function getImageColors(imageSource: ImageSource) {
    const vibrantBuilder = Vibrant.from(imageSource);
    const palette = await vibrantBuilder.getPalette();

    return Object.values(palette)
        .map((color) => color?.hex)
        .filter(Boolean) as string[];
}
