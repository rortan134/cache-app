import "server-only";

import { parsePublicHttpUrl } from "@/lib/common/server-net";
import { fetchWithTimeout } from "@/lib/common/timeout";
import { prisma } from "@/prisma";
import { AutomationPayloadScope } from "@/prisma/client/enums";
import {
    AUTOMATION_ITEM_PAGE_LIMIT_DEFAULT,
    AUTOMATION_ITEM_PAGE_LIMIT_MAX,
    AUTOMATION_TEXT_PREVIEW_LENGTH_MAX,
    AUTOMATION_WEB_FETCH_BODY_LENGTH_MAX,
    AUTOMATION_WEB_FETCH_TIMEOUT_MS,
} from "./constants";
export {
    AutomationPayloadItemsInputSchema,
    AutomationWebFetchInputSchema,
    AutomationWebSearchInputSchema,
} from "./tool-inputs";

const AUTOMATION_WEB_FETCH_REDIRECT_LIMIT = 5;

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

    const page = items.slice(0, limit);
    const nextCursor = items.length > limit ? (page.at(-1)?.id ?? null) : null;

    return {
        items: page.map((item) => ({
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

        const response = await fetchWithTimeout(
            publicUrl.href,
            {
                headers: {
                    Accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.8",
                    "User-Agent":
                        "CacheAutomationBot/1.0 (+https://www.cachd.app)",
                },
                redirect: "manual",
            },
            AUTOMATION_WEB_FETCH_TIMEOUT_MS
        );

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
