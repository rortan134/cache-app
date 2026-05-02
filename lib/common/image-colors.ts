import { Vibrant } from "node-vibrant/browser";

type ImageSource = Parameters<typeof Vibrant.from>[0];

export async function getImageColors(imageSource: ImageSource) {
    const palette = await Vibrant.from(imageSource).getPalette();

    const colors: string[] = [];
    for (const swatch of Object.values(palette)) {
        if (swatch?.hex) {
            colors.push(swatch.hex);
        }
    }
    return colors;
}
