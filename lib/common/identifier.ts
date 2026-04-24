import { customAlphabet } from "nanoid";
import * as z from "zod";

/*
 * An identifier is any string the user gives us to be used as a lookup key.
 * It must be URL safe and fit into our database (varchar 256)
 */
export const identifier = z
    .string()
    .min(3)
    .max(256)
    .regex(
        /^[a-zA-Z0-9_.:-]*$/,
        "Only alphanumeric, underscores, periods, colons and hyphens are allowed"
    );

const TRAILING_SLASHES = /\/+$/;
const LEADING_SLASHES = /^\/+/;

type IdentifierEnvironment =
    | "cache/app" /* client */
    | "wh" /* webhook */
    | "cache"; /* caching layer such as redis or in-memory */

export function buildIdentifierKey(
    key: string,
    environment: IdentifierEnvironment = "cache/app"
): string {
    const env = environment.replace(TRAILING_SLASHES, "");
    const k = key.replace(LEADING_SLASHES, "");
    return `${env}/${k}`;
}

const nanoid = customAlphabet(
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
);

export function newId<TPrefix extends IdentifierEnvironment>(prefix: TPrefix) {
    return `${prefix}_${nanoid(12)}` as const;
}
