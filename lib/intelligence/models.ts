import { unique } from "@/lib/common/arrays";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
export const FALLBACK_MODELS = ["gemini-3.1-flash-lite"] as const;

export const MODELS = [DEFAULT_MODEL, ...FALLBACK_MODELS] as const;

export type ModelId = (typeof MODELS)[number];

export function resolveGenAIModels(): ModelId[] {
    return unique([...MODELS]);
}
