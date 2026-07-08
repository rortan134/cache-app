import type { AutomationTemplateKey } from "@/prisma/client/enums";

export const AUTOMATION_AGENT_MODEL_DEFAULT = "anthropic/claude-sonnet-4.6";
export const AUTOMATION_DUE_BATCH_LIMIT = 10;
export const AUTOMATION_INSPECTED_ITEM_COUNT_MAX = 120;
export const AUTOMATION_ITEM_PAGE_LIMIT_DEFAULT = 20;
export const AUTOMATION_ITEM_PAGE_LIMIT_MAX = 50;
export const AUTOMATION_LEASE_DURATION_MS = 10 * 60 * 1000;
export const AUTOMATION_RUNNING_TIMEOUT_MS = 45 * 60 * 1000;
export const AUTOMATION_TEXT_PREVIEW_LENGTH_MAX = 1200;
export const AUTOMATION_WEB_FETCH_BODY_LENGTH_MAX = 12_000;
export const AUTOMATION_WEB_FETCH_TIMEOUT_MS = 15_000;
export const AUTOMATION_WEB_FETCH_RETRY_ATTEMPTS = 3;
export const AUTOMATION_WEB_FETCH_RETRY_BASE_DELAY_MS = 1000;
export const AUTOMATION_WEB_FETCH_TOTAL_TIMEOUT_MS = 30_000;

// Built-in automations seeded for every new user at signup time. Smart
// collections is intentionally NOT here: it is a per-user Library preference
// (`User.smartCollectionsEnabled`) backed by the event-driven classifier
// that runs on every save, not a scheduled automation.
export const AUTOMATION_TEMPLATE_DEFINITIONS = [
    {
        cadence: "weekly",
        prompt: "Create a concise weekly digest of the most useful saved items. Group related ideas, call out what deserves attention, and include practical next steps.",
        templateKey: "weekly_digest",
        title: "Weekly digest",
    },
] as const satisfies Array<{
    cadence: "daily" | "weekly" | "monthly";
    prompt: string;
    templateKey: AutomationTemplateKey;
    title: string;
}>;
