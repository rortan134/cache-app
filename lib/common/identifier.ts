import { ID_LENGTH } from "@/lib/common/constants";
import { customAlphabet } from "nanoid";
import * as z from "zod";

const TRAILING_SLASH_RE = /\/+$/;
const LEADING_SLASH_RE = /^\/+/;

const nanoid = customAlphabet(
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
);

const prefixes = {
    benchmark: "ben",
    caching: "cache" /* caching layer such as redis or in-memory */,
    client: "app" /* client-facing prefix */,
    webhook: "wh",
} as const;

type IdentifierPrefixKey = keyof typeof prefixes;
type IdentifierPrefix = (typeof prefixes)[IdentifierPrefixKey];

/**
 * An identifier is any string the user gives us to be used as a lookup key.
 * It must be URL-safe and fit into our database (varchar(256)).
 */
export const identifier = z
    .string()
    .min(3)
    .max(256)
    .regex(
        /^[a-zA-Z0-9_.:-]*$/,
        "Only alphanumeric characters, underscores, periods, colons, and hyphens are allowed"
    );

export function buildIdentifierKey(
    key: string,
    prefix: IdentifierPrefix = "app"
): string {
    return `${prefix.replace(TRAILING_SLASH_RE, "")}/${key.replace(LEADING_SLASH_RE, "")}`;
}

export function createNewId<TPrefix extends IdentifierPrefix>(prefix: TPrefix) {
    return `${prefix}_${nanoid(ID_LENGTH)}` as const;
}

export function identifierKeySchema(prefix: IdentifierPrefixKey) {
    return identifier.startsWith(prefixes[prefix]);
}

let lastTimestamp = 0;
let counter = 0;

function bytesToHex(bytes: Uint8Array): string {
    let hex = "";
    for (const byte of bytes) {
        hex += byte.toString(16).padStart(2, "0");
    }
    return hex;
}

export function createNewIdWithTimestamp<TPrefix extends IdentifierPrefix>(
    prefix: TPrefix,
    descending: boolean,
    timestamp?: number
) {
    const currentTimestamp = timestamp ?? Date.now();

    if (currentTimestamp !== lastTimestamp) {
        lastTimestamp = currentTimestamp;
        counter = 0;
    }
    counter += 1;

    let now = BigInt(currentTimestamp) * BigInt(0x10_00) + BigInt(counter);

    if (descending) {
        now = ~now;
    }

    const timeBytes = new Uint8Array(6);
    for (let i = 0; i < 6; i += 1) {
        timeBytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff));
    }

    return createNewId(prefix) + bytesToHex(timeBytes);
}
