import { Vibrant } from "node-vibrant/browser";

type ImageSource = Parameters<typeof Vibrant.from>[0];

export async function getImageColors(imageSource: ImageSource) {
    const palette = await Vibrant.from(imageSource).getPalette();

    const colors: { hex: string; name: string }[] = [];
    for (const [name, swatch] of Object.entries(palette)) {
        if (swatch?.hex) {
            colors.push({ hex: swatch.hex, name });
        }
    }
    return colors;
}
