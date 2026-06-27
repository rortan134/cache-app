import { createLogger } from "@/lib/common/logs/console/logger";
import { DurableAgent } from "@workflow/ai/agent";
import type { UIMessageChunk } from "ai";
import { isStepCount, tool, type LanguageModelUsage } from "ai";
import { getWritable } from "workflow";
import {
    AUTOMATION_AGENT_MODEL_DEFAULT,
    AUTOMATION_INSPECTED_ITEM_COUNT_MAX,
} from "./constants";
import {
    AutomationPayloadItemsInputSchema,
    AutomationWebFetchInputSchema,
    AutomationWebSearchInputSchema,
    EmptyAutomationToolInputSchema,
    type AutomationWebSearchTimeRange,
} from "./tool-inputs";

const AUTOMATION_OUTPUT_TOKEN_LIMIT = 1200;

const log = createLogger("automations:workflow");

interface PreparedAutomationRun {
    modelId: string | null;
    payloadScope: string;
    prompt: string;
    runId: string;
    scheduledForUtc: string;
    templateKey: string | null;
    userId: string;
}

type AutomationRunSource = Record<string, string>;
type AutomationRunSources =
    | {
          itemIds: string[];
      }
    | {
          sources: AutomationRunSource[];
      };
interface GenAiProtectionErrorData {
    data: {
        message: string;
        reason: "quota_exceeded" | "prompt_injection" | "forbidden";
    };
}

export async function prepareAutomationRunForWorkflow(args: {
    runId: string;
    workflowRunId: string;
}) {
    "use step";
    const { markAutomationRunRunning } = await import("./service");
    return await markAutomationRunRunning(args);
}

export async function executeSmartCollectionsAutomationRun(args: {
    runId: string;
    userId: string;
}) {
    "use step";

    const [{ autoTagLibraryItemsByIds }, service] = await Promise.all([
        import("@/lib/intelligence"),
        import("./service"),
    ]);
    const itemIds = await service.getSmartCollectionItemIdsForRun({
        runId: args.runId,
    });
    if (itemIds.length > 0) {
        await autoTagLibraryItemsByIds({
            itemIds,
            userId: args.userId,
        });
    }

    const summaryMarkdown =
        itemIds.length === 0
            ? "No newly saved items needed smart collection classification."
            : `Smart collections checked ${itemIds.length} newly saved ${itemIds.length === 1 ? "item" : "items"}.`;

    await service.finishAutomationRun({
        runId: args.runId,
        sources: {
            itemIds,
        },
        status: "succeeded",
        summaryMarkdown,
    });
}

export async function executeReadOnlyAutomationRun(
    prepared: PreparedAutomationRun
) {
    const sources: AutomationRunSource[] = [];
    const instructions = buildAutomationInstructions(prepared);
    const userMessage = buildAutomationUserMessage(prepared);

    const agent = new DurableAgent({
        instructions,
        maxOutputTokens: AUTOMATION_OUTPUT_TOKEN_LIMIT,
        model: prepared.modelId ?? AUTOMATION_AGENT_MODEL_DEFAULT,
        temperature: 0.2,
        tools: {
            getAutomationPayloadSummary: tool({
                description:
                    "Return the total size and scope of the saved-content payload available to this automation run.",
                execute: async () =>
                    getAutomationPayloadSummaryForWorkflow({
                        runId: prepared.runId,
                    }),
                inputSchema: EmptyAutomationToolInputSchema,
            }),
            listAutomationPayloadItems: tool({
                description:
                    "Page through saved items available to this automation run. Use this before writing the final summary.",
                execute: async (input) => {
                    const result = await listAutomationPayloadItemsForWorkflow({
                        cursor: input.cursor,
                        limit: input.limit,
                        runId: prepared.runId,
                        search: input.search,
                    });
                    for (const item of result.items) {
                        sources.push({
                            id: item.id,
                            title: item.caption ?? item.url,
                            type: "library_item",
                            url: item.url,
                        });
                    }
                    return result;
                },
                inputSchema: AutomationPayloadItemsInputSchema,
            }),
            web_fetch: tool({
                description:
                    "Fetch a public http(s) URL with SSRF protections and a bounded response body.",
                execute: async (input) => {
                    const result = await automationWebFetchForWorkflow({
                        url: input.url,
                    });
                    if (typeof result.url === "string") {
                        sources.push({
                            type: "web",
                            url: result.url,
                        });
                    }
                    return result;
                },
                inputSchema: AutomationWebFetchInputSchema,
            }),
            web_search: tool({
                description:
                    "Search the web for current public information using Tavily.",
                execute: async (input) => {
                    const result = await automationWebSearchForWorkflow(input);
                    for (const webResult of result.results) {
                        sources.push({
                            title: webResult.title,
                            type: "web",
                            url: webResult.url,
                        });
                    }
                    return result;
                },
                inputSchema: AutomationWebSearchInputSchema,
            }),
        },
    });

    try {
        await protectAutomationAgentRun({
            prompt: `${instructions}\n\n${userMessage}`,
            userId: prepared.userId,
        });

        const result = await agent.stream({
            maxSteps: 6,
            messages: [
                {
                    content: userMessage,
                    role: "user",
                },
            ],
            stopWhen: isStepCount(6),
            writable: getWritable<UIMessageChunk>(),
        });

        await finishAutomationRunForWorkflow({
            runId: prepared.runId,
            sources: uniqueSources(sources),
            status: "succeeded",
            summaryMarkdown: getFinalStepText(result.steps),
            usage: normalizeStepUsage(result.steps),
        });
    } catch (error) {
        if (isGenAiProtectionErrorData(error)) {
            await finishAutomationRunForWorkflow({
                errorCode: error.data.reason,
                errorMessage: error.data.message,
                runId: prepared.runId,
                status: "failed",
                summaryMarkdown:
                    "This automation was blocked by AI usage protection before it ran.",
            });
            return;
        }

        log.error("Automation agent run failed", error);
        await finishAutomationRunForWorkflow({
            errorCode: "agent_failed",
            errorMessage:
                error instanceof Error ? error.message : String(error),
            runId: prepared.runId,
            status: "failed",
            summaryMarkdown:
                "This automation failed before producing a result.",
        });
    }
}

async function protectAutomationAgentRun(args: {
    prompt: string;
    userId: string;
}) {
    "use step";

    const { estimateGenAiTokens, protectGenAiRequest } = await import(
        "@/lib/intelligence/protection"
    );

    await protectGenAiRequest({
        feature: "automation_agent",
        prompt: args.prompt,
        request: new Request("https://cache.local/internal/automations"),
        requestedTokens: estimateGenAiTokens(
            args.prompt,
            AUTOMATION_OUTPUT_TOKEN_LIMIT
        ),
        userId: args.userId,
    });
}

async function getAutomationPayloadSummaryForWorkflow(args: { runId: string }) {
    "use step";
    const { getAutomationPayloadSummary } = await import("./payload");
    return await getAutomationPayloadSummary(args);
}

async function listAutomationPayloadItemsForWorkflow(args: {
    cursor?: string;
    limit?: number;
    runId: string;
    search?: string;
}) {
    "use step";
    const { listAutomationPayloadItems } = await import("./payload");
    return await listAutomationPayloadItems(args);
}

async function automationWebFetchForWorkflow(args: { url: string }) {
    "use step";
    const { automationWebFetch } = await import("./payload");
    return await automationWebFetch(args);
}

async function automationWebSearchForWorkflow(args: {
    query: string;
    timeRange?: AutomationWebSearchTimeRange;
}) {
    "use step";
    const { automationWebSearch } = await import("./web-search");
    return await automationWebSearch(args);
}

async function finishAutomationRunForWorkflow(args: {
    errorCode?: string;
    errorMessage?: string;
    runId: string;
    sources?: AutomationRunSources;
    status: "succeeded" | "failed";
    summaryMarkdown?: string;
    usage?: Record<string, number>;
}) {
    "use step";
    const { finishAutomationRun } = await import("./service");
    await finishAutomationRun(args);
}

function isGenAiProtectionErrorData(
    error: unknown
): error is GenAiProtectionErrorData {
    if (typeof error !== "object" || error === null || !("data" in error)) {
        return false;
    }

    const data = error.data;
    if (typeof data !== "object" || data === null) {
        return false;
    }

    return (
        "message" in data &&
        typeof data.message === "string" &&
        "reason" in data &&
        (data.reason === "quota_exceeded" ||
            data.reason === "prompt_injection" ||
            data.reason === "forbidden")
    );
}

function buildAutomationInstructions(prepared: PreparedAutomationRun): string {
    return [
        "You are Cache's scheduled automation agent.",
        "You help users make saved content useful without mutating their library.",
        "Use the payload tools to inspect saved items. Do not claim to inspect items you did not retrieve.",
        `Inspect at most ${AUTOMATION_INSPECTED_ITEM_COUNT_MAX} saved items. If the payload is larger, disclose that the result is based on a bounded sample.`,
        "Use web_search and web_fetch only when current public context is useful.",
        "Return concise markdown. Include practical next steps when relevant.",
        `Scheduled run time: ${prepared.scheduledForUtc}`,
        `Payload scope: ${prepared.payloadScope}`,
    ].join("\n");
}

function buildAutomationUserMessage(prepared: PreparedAutomationRun): string {
    return [
        "Run this saved-content automation:",
        "",
        prepared.prompt,
        "",
        "Return the final result as concise markdown.",
    ].join("\n");
}

function uniqueSources(sources: AutomationRunSource[]) {
    const byKey = new Map<string, AutomationRunSource>();
    for (const source of sources) {
        const key = `${source.type}:${source.id ?? source.url ?? ""}`;
        if (key.endsWith(":")) {
            continue;
        }
        if (!byKey.has(key)) {
            byKey.set(key, source);
        }
    }
    return {
        sources: [...byKey.values()].slice(0, 100),
    };
}

function getFinalStepText(steps: Array<{ text?: string }>): string {
    const finalText = steps.findLast((step) => step.text?.trim())?.text?.trim();
    if (finalText) {
        return finalText;
    }

    return "The automation completed, but it did not produce a text summary.";
}

function normalizeStepUsage(
    steps: Array<{ usage?: LanguageModelUsage }>
): Record<string, number> | undefined {
    if (steps.length === 0) {
        return;
    }

    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    for (const step of steps) {
        inputTokens += step.usage?.inputTokens ?? 0;
        outputTokens += step.usage?.outputTokens ?? 0;
        totalTokens += step.usage?.totalTokens ?? 0;
    }

    return { inputTokens, outputTokens, totalTokens };
}
