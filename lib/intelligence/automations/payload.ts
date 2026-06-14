import "server-only";

import { isAbortError, abortAfter } from "@/lib/common/abort";
import { HttpError } from "@/lib/common/http-error";
import { withRetry } from "@/lib/common/retry";
import { parsePublicHttpUrl } from "@/lib/common/server-net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { prisma } from "@/prisma";
import { AutomationPayloadScope } from "@/prisma/client/enums";
import {
    AUTOMATION_ITEM_PAGE_LIMIT_DEFAULT,
    AUTOMATION_ITEM_PAGE_LIMIT_MAX,
    AUTOMATION_TEXT_PREVIEW_LENGTH_MAX,
    AUTOMATION_WEB_FETCH_BODY_LENGTH_MAX,
    AUTOMATION_WEB_FETCH_RETRY_ATTEMPTS,
    AUTOMATION_WEB_FETCH_RETRY_BASE_DELAY_MS,
    AUTOMATION_WEB_FETCH_TIMEOUT_MS,
    AUTOMATION_WEB_FETCH_TOTAL_TIMEOUT_MS,
} from "./constants";
export {
    AutomationPayloadItemsInputSchema,
    AutomationWebFetchInputSchema,
    AutomationWebSearchInputSchema,
} from "./tool-inputs";

const AUTOMATION_WEB_FETCH_REDIRECT_LIMIT = 5;
const AUTOMATION_WEB_FETCH_CAPTCHA_SCAN_BYTES = 4096;

const AUTOMATION_WEB_FETCH_HEADERS: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.8",
    "User-Agent": "CacheAutomationBot/1.0 (+https://www.cachd.app)",
};

function isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
}

function parseRetryAfterMs(response: Response): number | null {
    const header = response.headers.get("retry-after");
    if (!header) {
        return null;
    }

    const seconds = Number(header);
    if (!Number.isNaN(seconds)) {
        return seconds * 1000;
    }

    try {
        const date = new Date(header);
        if (!Number.isNaN(date.getTime())) {
            return Math.max(0, date.getTime() - Date.now());
        }
    } catch {
        return null;
    }

    return null;
}

function hasCaptchaChallenge(text: string): boolean {
    const scanText = text
        .slice(0, AUTOMATION_WEB_FETCH_CAPTCHA_SCAN_BYTES)
        .toLowerCase();
    return (
        scanText.includes("g-recaptcha") ||
        scanText.includes("h-captcha") ||
        scanText.includes("cf-challenge") ||
        scanText.includes("_cf_chl_opt") ||
        scanText.includes("turnstile") ||
        scanText.includes("just a moment") ||
        scanText.includes("checking your browser") ||
        scanText.includes("please verify you are human") ||
        scanText.includes("challenge-platform")
    );
}

interface AutomationRunPayloadScope {
    collectionIdSnapshot: string | null;
    payloadScopeSnapshot: AutomationPayloadScope;
    userId: string;
}

export async function getAutomationPayloadSummary(args: { runId: string }) {
    "use step";

    const run = await getAutomationRunPayloadScope(args.runId);
    if (!run) {
        return {
            itemCount: 0,
            scope: "missing",
        };
    }

    const itemCount = await prisma.libraryItem.count({
        where: getPayloadWhere(run),
    });

    return {
        itemCount,
        scope:
            run.payloadScopeSnapshot === AutomationPayloadScope.collection
                ? "collection"
                : "all_library_items",
        truncated: false,
    };
}

export async function listAutomationPayloadItems(args: {
    cursor?: string;
    limit?: number;
    runId: string;
    search?: string;
}) {
    "use step";

    const run = await getAutomationRunPayloadScope(args.runId);
    if (!run) {
        return {
            items: [],
            nextCursor: null,
            truncated: false,
        };
    }

    const limit = Math.min(
        args.limit ?? AUTOMATION_ITEM_PAGE_LIMIT_DEFAULT,
        AUTOMATION_ITEM_PAGE_LIMIT_MAX
    );
    const items = await prisma.libraryItem.findMany({
        cursor: args.cursor ? { id: args.cursor } : undefined,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
            caption: true,
            collections: {
                orderBy: {
                    name: "asc",
                },
                select: {
                    id: true,
                    name: true,
                },
            },
            createdAt: true,
            id: true,
            kind: true,
            noteContentText: true,
            postedAt: true,
            source: true,
            updatedAt: true,
            url: true,
        },
        skip: args.cursor ? 1 : 0,
        take: limit + 1,
        where: {
            ...getPayloadWhere(run),
            ...(args.search
                ? {
                      OR: [
                          {
                              caption: {
                                  contains: args.search,
                                  mode: "insensitive",
                              },
                          },
                          {
                              noteContentText: {
                                  contains: args.search,
                                  mode: "insensitive",
                              },
                          },
                          {
                              url: {
                                  contains: args.search,
                                  mode: "insensitive",
                              },
                          },
                      ],
                  }
                : {}),
        },
    });

    const visibleItems = items.slice(0, limit);
    const nextCursor =
        items.length > limit ? (visibleItems.at(-1)?.id ?? null) : null;

    return {
        items: visibleItems.map((item) => ({
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
            updatedAt: item.updatedAt.toISOString(),
            url: item.url,
        })),
        nextCursor,
        truncated: Boolean(nextCursor),
    };
}

export async function automationWebFetch(args: { url: string }) {
    "use step";

    const totalTimeout = abortAfter(AUTOMATION_WEB_FETCH_TOTAL_TIMEOUT_MS);

    try {
        let currentUrl = args.url;
        for (
            let redirectCount = 0;
            redirectCount <= AUTOMATION_WEB_FETCH_REDIRECT_LIMIT;
            redirectCount += 1
        ) {
            const publicUrl = await parsePublicHttpUrl(currentUrl);
            if (!publicUrl) {
                return {
                    error: "URL is blocked because it points to a local or private host.",
                    ok: false,
                };
            }

            let response: Response;
            try {
                response = await withRetry(
                    async () => {
                        const res = await fetchWithTimeout(
                            publicUrl.href,
                            {
                                headers: AUTOMATION_WEB_FETCH_HEADERS,
                                redirect: "manual",
                            },
                            AUTOMATION_WEB_FETCH_TIMEOUT_MS,
                            totalTimeout.signal
                        );

                        if (isRetryableStatus(res.status)) {
                            await res.body?.cancel().catch(() => undefined);
                            throw new HttpError(
                                res.status,
                                parseRetryAfterMs(res) ?? undefined
                            );
                        }

                        return res;
                    },
                    {
                        attempts: AUTOMATION_WEB_FETCH_RETRY_ATTEMPTS,
                        delayMs: (attempt, error) => {
                            if (
                                error instanceof HttpError &&
                                error.retryAfter !== null
                            ) {
                                return error.retryAfter;
                            }
                            return (
                                AUTOMATION_WEB_FETCH_RETRY_BASE_DELAY_MS *
                                2 ** attempt
                            );
                        },
                        shouldRetry: (error) => {
                            if (error instanceof HttpError) {
                                return error.isRetryable();
                            }
                            if (error instanceof Error) {
                                return (
                                    error.message.includes("aborted") ||
                                    error.message.includes("fetch failed")
                                );
                            }
                            return true;
                        },
                        signal: totalTimeout.signal,
                    }
                );
            } catch (error) {
                if (isAbortError(error)) {
                    return {
                        error: "URL fetch timed out.",
                        ok: false,
                    };
                }
                const message =
                    error instanceof Error ? error.message : "Unknown error";
                return {
                    error: `Failed to fetch URL: ${message}`,
                    ok: false,
                };
            }

            if (isRedirectResponse(response.status)) {
                const location = response.headers.get("location");
                await response.body?.cancel().catch(() => undefined);
                if (!location) {
                    return {
                        error: "URL redirected without a Location header.",
                        ok: false,
                        status: response.status,
                        url: publicUrl.href,
                    };
                }
                currentUrl = new URL(location, publicUrl).href;
                continue;
            }

            const text = await response.text();

            if (hasCaptchaChallenge(text)) {
                return {
                    error: "URL triggered a browser challenge or CAPTCHA and could not be fetched.",
                    ok: false,
                    status: response.status,
                    url: response.url || publicUrl.href,
                };
            }

            return {
                body: text.slice(0, AUTOMATION_WEB_FETCH_BODY_LENGTH_MAX),
                ok: response.ok,
                status: response.status,
                truncated: text.length > AUTOMATION_WEB_FETCH_BODY_LENGTH_MAX,
                url: response.url || publicUrl.href,
            };
        }

        return {
            error: "URL redirected too many times.",
            ok: false,
        };
    } finally {
        totalTimeout.clearTimeout();
    }
}

function isRedirectResponse(status: number): boolean {
    return status >= 300 && status < 400;
}

function getPayloadWhere(run: AutomationRunPayloadScope) {
    return {
        ...(run.payloadScopeSnapshot === AutomationPayloadScope.collection
            ? {
                  collections: {
                      some: {
                          id: run.collectionIdSnapshot ?? "",
                      },
                  },
              }
            : {}),
        userId: run.userId,
    };
}

function getAutomationRunPayloadScope(
    runId: string
): Promise<AutomationRunPayloadScope | null> {
    return prisma.automationRun.findUnique({
        select: {
            collectionIdSnapshot: true,
            payloadScopeSnapshot: true,
            userId: true,
        },
        where: {
            id: runId,
        },
    });
}

function truncateText(value: string | null): string | null {
    if (!value) {
        return null;
    }
    if (value.length <= AUTOMATION_TEXT_PREVIEW_LENGTH_MAX) {
        return value;
    }
    return `${value.slice(0, AUTOMATION_TEXT_PREVIEW_LENGTH_MAX).trimEnd()}...`;
}
