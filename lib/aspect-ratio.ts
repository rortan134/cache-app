import * as z from "zod";

// Euclidean algorithm to find greatest common divisor
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const getAspectRatio = (width: number, height: number) => {
    const gcdResult = gcd(width, height);
    return {
        aspectRatio: `${width / gcdResult}:${height / gcdResult}`,
        divided: width / height,
    };
};

const CASE_ELEMENT = /x/i;

export const parseProportionsFromResolution = (
    resolution: string
): [number, number] =>
    z
        .tuple([z.coerce.number(), z.coerce.number()])
        .parse(z.string().parse(resolution).split(CASE_ELEMENT));
