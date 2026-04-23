import "server-only";

import { asRecord } from "@/lib/common/objects";

export type ProviderPayloadRecord = Record<string, unknown>;

export function asProviderPayloadRecord(
    value: unknown
): ProviderPayloadRecord | null {
    return asRecord(value);
}

export function readPayloadDate(value: unknown): Date | null {
    const raw = readPayloadString(value);
    if (!raw) {
        return null;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function readPayloadNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readPayloadString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

export function readPayloadStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
}
