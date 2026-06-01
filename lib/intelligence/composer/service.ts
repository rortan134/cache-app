import "server-only";

import { serverEnv } from "@/env/server";
import { LIBRARY_ITEM_COLLECTIONS_INCLUDE } from "@/lib/collections/utils";
import { ITEM_KIND_FOLDER, SORT_DESC } from "@/lib/common/constants";
import { createLogger } from "@/lib/common/logs/console/logger";
import { isRecord } from "@/lib/common/objects";
import { parseDisplayUrl } from "@/lib/common/url";
import { prisma } from "@/prisma";
import type { Prisma } from "@/prisma/client/client";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ArcjetNextRequest } from "@arcjet/next";
import { DurableAgent } from "@workflow/ai/agent";
import {
    APICallError,
    LoadAPIKeyError,
    RetryError,
    stepCountIs,
    tool,
    type LanguageModelUsage,
    type UIMessageChunk,
} from "ai";
import * as z from "zod";
import { AUTOMATION_WEB_SEARCH_TIME_RANGES } from "../automations/tool-inputs";
import { automationWebSearch } from "../automations/web-search";
import { GenAiGenerationError } from "../error";
import { normalizeGeneratedMarkdown } from "../markdown";
import { estimateGenAiTokens, protectGenAiRequest } from "../protection";
import {
    ASK_CACHE_OPERATION_LIMIT,
    ASK_CACHE_SOURCE_FILTER_VALUES,
    AskCacheToolUpdateInputSchema,
    type AskCacheComposerPatch,
    type AskCacheRequest,
} from "./ask-cache";

const ASK_CACHE_MODEL_DEFAULT = "gemini-3.1-flash-lite";
const ASK_CACHE_OUTPUT_TOKEN_LIMIT = 900;
const ASK_CACHE_MAX_STEPS = 5;
const ASK_CACHE_TIMEOUT_MS = 45_000;
const ASK_CACHE_LIBRARY_SEARCH_LIMIT_MAX = 12;
const ASK_CACHE_LIBRARY_TEXT_PREVIEW_LENGTH_MAX = 800;
const ASK_CACHE_PROVIDER_CONFIGURATION_ERROR_MESSAGE =
    "Cache AI provider credentials are missing or invalid.";
const ASK_CACHE_RUNTIME_CONTEXT_LOCALE_DEFAULT = "en-US";
const ASK_CACHE_RUNTIME_CONTEXT_SURFACE_LABEL_BY_VALUE = {
    library_composer: "Cache library composer",
} as const;

const log = createLogger("intelligence:ask-cache");

const AskCacheLibrarySearchInputSchema = z.strictObject({
    collectionIds: z
        .array(z.string().trim().min(1).max(128))
        .max(10)
        .optional(),
    domainFilters: z
        .array(z.string().trim().min(1).max(120))
        .max(10)
        .optional(),
    limit: z.int().min(1).max(ASK_CACHE_LIBRARY_SEARCH_LIMIT_MAX).optional(),
    query: z.string().trim().max(200).optional(),
    sourceFilters: z
        .array(z.enum(ASK_CACHE_SOURCE_FILTER_VALUES))
        .max(10)
        .optional(),
});

const AskCacheWebSearchInputSchema = z.strictObject({
    query: z.string().trim().min(1).max(500),
    timeRange: z.enum(AUTOMATION_WEB_SEARCH_TIME_RANGES).optional(),
});

interface RunAskCacheAgentInput {
    input: AskCacheRequest;
    request: ArcjetNextRequest;
    userId: string;
}

interface RunAskCacheAgentResult {
    markdown: string;
    operations: AskCacheComposerPatch[];
    usage?: Record<string, number>;
}

const googleGenAi = createGoogleGenerativeAI({
    apiKey: serverEnv.GEMINI_API_KEY,
});

export async function runAskCacheAgent({
    input,
    request,
    userId,
}: RunAskCacheAgentInput): Promise<RunAskCacheAgentResult> {
    const operations: AskCacheComposerPatch[] = [];
    const instructions = buildAskCacheInstructions(input);
    const userMessage = buildAskCacheUserMessage(input);

    await protectGenAiRequest({
        feature: "ask_cache_agent",
        prompt: input.prompt,
        request,
        requestedTokens: estimateGenAiTokens(
            `${instructions}\n\n${userMessage}`,
            ASK_CACHE_OUTPUT_TOKEN_LIMIT
        ),
        userId,
    });

    const agent = new DurableAgent({
        instructions,
        maxOutputTokens: ASK_CACHE_OUTPUT_TOKEN_LIMIT,
        model: () => Promise.resolve(googleGenAi(ASK_CACHE_MODEL_DEFAULT)),
        temperature: 0.2,
        tools: {
            search_library: tool({
                description:
                    "Search the user's saved Cache library. Use this when the answer depends on saved bookmarks or notes.",
                execute: (toolInput) =>
                    searchAskCacheLibrary({
                        input: toolInput,
                        userId,
                    }),
                inputSchema: AskCacheLibrarySearchInputSchema,
            }),
            update_composer: tool({
                description:
                    "Apply a validated composer patch. Use this to change search terms, collection/source/domain filters, collection membership, grouping, sorting, columns, or reset state.",
                execute: (toolInput) => {
                    if (operations.length >= ASK_CACHE_OPERATION_LIMIT) {
                        return {
                            ok: false,
                            reason: "operation_limit_reached",
                        };
                    }

                    const patch = normalizeComposerPatchForContext(
                        toolInput.patch,
                        input
                    );
                    operations.push(patch);
                    return {
                        appliedOperationCount: operations.length,
                        ok: true,
                        patch,
                        summary: toolInput.summary,
                    };
                },
                inputSchema: AskCacheToolUpdateInputSchema,
            }),
            web_search: tool({
                description:
                    "Search the public web for current context. Use this only when public, current information would improve the answer.",
                execute: automationWebSearch,
                inputSchema: AskCacheWebSearchInputSchema,
            }),
        },
    });

    try {
        const result = await agent.stream({
            maxSteps: ASK_CACHE_MAX_STEPS,
            messages: [{ content: userMessage, role: "user" }],
            stopWhen: stepCountIs(ASK_CACHE_MAX_STEPS),
            timeout: ASK_CACHE_TIMEOUT_MS,
            writable: new WritableStream<UIMessageChunk>(),
        });
        const markdown = getFinalStepText(result.steps);

        return {
            markdown,
            operations,
            usage: normalizeStepUsage(result.steps),
        };
    } catch (error) {
        const apiError = classifyAskCacheApiError(error);
        log.error("Ask Cache agent run failed", {
            errorMessage:
                error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
            status: apiError.status,
            userId,
        });

        throw new GenAiGenerationError({
            message: apiError.message,
            operation: "runAskCacheAgent",
            status: apiError.status,
        });
    }
}

async function searchAskCacheLibrary(args: {
    input: z.infer<typeof AskCacheLibrarySearchInputSchema>;
    userId: string;
}) {
    const limit = Math.min(
        args.input.limit ?? 8,
        ASK_CACHE_LIBRARY_SEARCH_LIMIT_MAX
    );
    const search = args.input.query?.trim();
    const collectionIds = args.input.collectionIds ?? [];
    const sourceFilters = args.input.sourceFilters ?? [];
    const domainFilters = (args.input.domainFilters ?? []).map((domain) =>
        domain.toLowerCase()
    );
    const searchCondition: Prisma.LibraryItemWhereInput | null = search
        ? {
              OR: [
                  { caption: { contains: search, mode: "insensitive" } },
                  {
                      noteContentText: {
                          contains: search,
                          mode: "insensitive",
                      },
                  },
                  { url: { contains: search, mode: "insensitive" } },
              ],
          }
        : null;
    const domainCondition = buildAskCacheDomainCondition(domainFilters);
    const andConditions = [searchCondition, domainCondition].filter(
        (condition): condition is Prisma.LibraryItemWhereInput =>
            condition !== null
    );

    const items = await prisma.libraryItem.findMany({
        include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
        orderBy: [{ scrapedAt: SORT_DESC }, { updatedAt: SORT_DESC }],
        take: limit + 1,
        where: {
            kind: { not: ITEM_KIND_FOLDER },
            userId: args.userId,
            ...(collectionIds.length > 0
                ? {
                      collections: {
                          some: { id: { in: collectionIds } },
                      },
                  }
                : {}),
            ...(sourceFilters.length > 0
                ? { source: { in: sourceFilters } }
                : {}),
            ...(andConditions.length > 0 ? { AND: andConditions } : {}),
        },
    });
    const pageItems = items
        .filter(
            (item) =>
                domainFilters.length === 0 ||
                domainFilters.includes(parseDisplayUrl(item.url).toLowerCase())
        )
        .slice(0, limit);

    return {
        items: pageItems.map((item) => ({
            caption: item.caption,
            collectionNames: item.collections.map(
                (collection) => collection.name
            ),
            createdAt: item.createdAt.toISOString(),
            id: item.id,
            kind: item.kind,
            postedAt: item.postedAt?.toISOString() ?? null,
            source: item.source,
            textPreview: truncateText(item.noteContentText),
            url: item.url,
        })),
        truncated: items.length > limit || pageItems.length < items.length,
    };
}

function buildAskCacheDomainCondition(
    domainFilters: string[]
): Prisma.LibraryItemWhereInput | null {
    if (domainFilters.length === 0) {
        return null;
    }

    const orConditions: Prisma.LibraryItemWhereInput[] = [];
    for (const domain of domainFilters) {
        const hostCandidates = domain.startsWith("www.")
            ? [domain]
            : [domain, `www.${domain}`];

        orConditions.push({ url: { equals: domain, mode: "insensitive" } });
        for (const host of hostCandidates) {
            orConditions.push({
                url: { equals: `http://${host}`, mode: "insensitive" },
            });
            orConditions.push({
                url: { equals: `https://${host}`, mode: "insensitive" },
            });
            for (const prefix of [
                `http://${host}/`,
                `http://${host}?`,
                `http://${host}#`,
                `http://${host}:`,
                `https://${host}/`,
                `https://${host}?`,
                `https://${host}#`,
                `https://${host}:`,
            ]) {
                orConditions.push({
                    url: { mode: "insensitive", startsWith: prefix },
                });
            }
        }
    }

    return { OR: orConditions };
}

function buildAskCacheInstructions(input: AskCacheRequest): string {
    const collectionCatalog = input.visibleContext.availableCollections.map(
        (collection) => ({
            id: collection.id,
            itemCount: collection.itemCount,
            name: collection.name,
        })
    );
    const runtimeContext = buildAskCacheRuntimeContext(input);

    return [
        "You are Ask Cache, an assistant embedded in Cache's library composer.",
        "You can answer conversationally and can update the composer by calling update_composer.",
        "Never claim to inspect library items unless you called search_library.",
        "Use update_composer for requests that ask to show, find, filter, sort, group, or reset.",
        "Use exact collection ids from the collection catalog when selecting collection filters.",
        "Use exact domains from the available domain list when applying domain filters.",
        "When a user asks for conceptual matches, infer what qualifies instead of searching only for the user's literal words.",
        "Library entries may not contain category labels like software product, recipe, tutorial, or inspiration in their caption, note text, URL, or metadata.",
        "For conceptual filters, search and filter by concrete signals that imply the concept: product names, company names, domains, source type, collections, URL patterns, captions, and note text.",
        "If the request is broad, inspect candidate items with search_library before applying filters, then update the composer with the strongest available search terms, source filters, domain filters, or collection filters.",
        "Prefer concise markdown. Mention applied composer changes in one short sentence when you call update_composer.",
        "Do not mutate saved items, collections, notes, or external services.",
        "",
        "Runtime context:",
        JSON.stringify(runtimeContext),
        "",
        "Current composer state:",
        JSON.stringify(input.composerState),
        "",
        "Visible context:",
        JSON.stringify({
            availableDomains: input.visibleContext.availableDomains,
            filteredItemCount: input.visibleContext.filteredItemCount,
            totalItemCount: input.visibleContext.totalItemCount,
        }),
        "",
        "Collection catalog:",
        JSON.stringify(collectionCatalog),
    ].join("\n");
}

function buildAskCacheRuntimeContext(input: AskCacheRequest) {
    const now = new Date();
    const clientTimeZone = normalizeAskCacheTimeZone(
        input.runtimeContext.clientTimeZone
    );
    const clientLocale = normalizeAskCacheLocale(
        input.runtimeContext.clientLocale
    );
    const formatter = new Intl.DateTimeFormat(clientLocale, {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: clientTimeZone,
    });

    return {
        app: "Cache",
        currentDateTime: formatter.format(now),
        currentIsoDateTime: now.toISOString(),
        surface:
            ASK_CACHE_RUNTIME_CONTEXT_SURFACE_LABEL_BY_VALUE[
                input.runtimeContext.surface
            ],
        timeZone: clientTimeZone,
    };
}

function normalizeAskCacheTimeZone(timeZone: string | undefined): string {
    if (!timeZone) {
        return "UTC";
    }

    try {
        new Intl.DateTimeFormat(ASK_CACHE_RUNTIME_CONTEXT_LOCALE_DEFAULT, {
            timeZone,
        }).format(new Date());
        return timeZone;
    } catch {
        return "UTC";
    }
}

function normalizeAskCacheLocale(locale: string | undefined): string {
    if (!locale) {
        return ASK_CACHE_RUNTIME_CONTEXT_LOCALE_DEFAULT;
    }

    try {
        Intl.getCanonicalLocales(locale);
        return locale;
    } catch {
        return ASK_CACHE_RUNTIME_CONTEXT_LOCALE_DEFAULT;
    }
}

function buildAskCacheUserMessage(input: AskCacheRequest): string {
    return [
        "User request:",
        input.prompt,
        "",
        "If this is a library navigation command, call update_composer with the exact state changes and then briefly explain what changed.",
        "If this is a normal question, answer directly and call tools only when they are useful.",
    ].join("\n");
}

function normalizeComposerPatchForContext(
    patch: AskCacheComposerPatch,
    request: AskCacheRequest
): AskCacheComposerPatch {
    const collectionIds = new Set(
        request.visibleContext.availableCollections.map(
            (collection) => collection.id
        )
    );
    const domains = new Set(request.visibleContext.availableDomains);

    return {
        ...patch,
        ...(patch.domainFilters
            ? {
                  domainFilters: patch.domainFilters.filter((domain) =>
                      domains.has(domain)
                  ),
              }
            : {}),
        ...(patch.selectedCollectionIds
            ? {
                  selectedCollectionIds: patch.selectedCollectionIds.filter(
                      (collectionId) => collectionIds.has(collectionId)
                  ),
              }
            : {}),
    };
}

function truncateText(value: string | null): string | null {
    if (!value) {
        return null;
    }
    return value.length > ASK_CACHE_LIBRARY_TEXT_PREVIEW_LENGTH_MAX
        ? `${value.slice(0, ASK_CACHE_LIBRARY_TEXT_PREVIEW_LENGTH_MAX - 1).trimEnd()}…`
        : value;
}

function getFinalStepText(steps: Array<{ text?: string }>): string {
    const finalText = normalizeGeneratedMarkdown(
        steps.findLast((step) => step.text?.trim())?.text
    );
    if (finalText) {
        return finalText;
    }

    return "Done.";
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

function classifyAskCacheApiError(error: unknown): {
    message: string;
    status: number;
} {
    const providerError = unwrapAskCacheProviderError(error);
    if (LoadAPIKeyError.isInstance(providerError)) {
        return {
            message: ASK_CACHE_PROVIDER_CONFIGURATION_ERROR_MESSAGE,
            status: 500,
        };
    }

    if (APICallError.isInstance(providerError)) {
        if (isProviderCredentialError(providerError)) {
            return {
                message: ASK_CACHE_PROVIDER_CONFIGURATION_ERROR_MESSAGE,
                status: 500,
            };
        }

        if (providerError.statusCode === 429) {
            return {
                message: "AI service quota exceeded. Please try again later.",
                status: 429,
            };
        }

        if (
            providerError.statusCode === 408 ||
            providerError.message.toLowerCase().includes("timeout")
        ) {
            return {
                message: "Request timed out. Please try again.",
                status: 408,
            };
        }

        if (
            providerError.statusCode !== undefined &&
            providerError.statusCode >= 500
        ) {
            return {
                message: "AI service temporarily unavailable.",
                status: 502,
            };
        }
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("timeout") || message.includes("abort")) {
            return {
                message: "Request timed out. Please try again.",
                status: 408,
            };
        }
    }

    return {
        message: "We couldn't ask Cache right now.",
        status: 500,
    };
}

function unwrapAskCacheProviderError(error: unknown): unknown {
    if (RetryError.isInstance(error)) {
        return unwrapAskCacheProviderError(error.lastError);
    }

    if (!isRecord(error)) {
        return error;
    }

    const { cause } = error;
    if (cause) {
        return unwrapAskCacheProviderError(cause);
    }

    return error;
}

function isProviderCredentialError(error: APICallError): boolean {
    const message = error.message.toLowerCase();
    return (
        error.statusCode === 401 ||
        error.statusCode === 403 ||
        (error.statusCode === 400 &&
            (message.includes("api key") ||
                message.includes("apikey") ||
                message.includes("credential"))) ||
        message.includes("unauthenticated") ||
        message.includes("authentication") ||
        message.includes("permission denied")
    );
}
