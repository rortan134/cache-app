import "server-only";

import { fetchWithTimeout } from "@/lib/common/timeout";
import { isBlockedHostname } from "@/lib/common/net";
import { prisma } from "@/prisma";
import { AutomationPayloadScope } from "@/prisma/client/enums";
import { lookup } from "node:dns/promises";
import * as z from "zod";
import {
    AUTOMATION_ITEM_PAGE_LIMIT_DEFAULT,
    AUTOMATION_ITEM_PAGE_LIMIT_MAX,
    AUTOMATION_TEXT_PREVIEW_LENGTH_MAX,
    AUTOMATION_WEB_FETCH_BODY_LENGTH_MAX,
    AUTOMATION_WEB_FETCH_TIMEOUT_MS,
} from "./constants";

const AUTOMATION_WEB_FETCH_REDIRECT_LIMIT = 5;
const IPV6_GROUP_COUNT = 8;
const IPV6_GROUP_PATTERN = /^[\da-f]{1,4}$/i;

export const AutomationPayloadItemsInputSchema = z.object({
    cursor: z.string().trim().min(1).optional(),
    limit: z.int().min(1).max(AUTOMATION_ITEM_PAGE_LIMIT_MAX).optional(),
    search: z.string().trim().max(200).optional(),
});

export const AutomationWebFetchInputSchema = z.object({
    url: z.url({ protocol: /^https?$/ }),
});

export const AutomationWebSearchInputSchema = z.object({
    query: z.string().trim().min(1).max(500),
    timeRange: z
        .enum(["year", "month", "week", "day", "y", "m", "w", "d"])
        .optional(),
});

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

async function parsePublicHttpUrl(value: string): Promise<URL | null> {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        return null;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
    }

    if (await resolvesToBlockedHostname(parsed.hostname)) {
        return null;
    }

    return parsed;
}

async function resolvesToBlockedHostname(hostname: string): Promise<boolean> {
    if (isBlockedHostname(hostname) || isPrivateIpv6Hostname(hostname)) {
        return true;
    }

    try {
        const records = await lookup(hostname, {
            all: true,
            verbatim: true,
        });
        if (records.length === 0) {
            return true;
        }
        return records.some(
            (record) =>
                isBlockedHostname(record.address) ||
                isPrivateIpv6Hostname(record.address)
        );
    } catch {
        return true;
    }
}

function isPrivateIpv6Hostname(hostname: string): boolean {
    const normalized = normalizeHostname(hostname);
    const groups = parseIpv6Address(normalized);
    if (!groups) {
        return false;
    }

    const mappedIpv4Address = getMappedIpv4Address(groups);
    if (mappedIpv4Address) {
        return isBlockedHostname(mappedIpv4Address);
    }

    const firstGroup = groups[0] ?? 0;
    const isUnspecified = groups.every((group) => group === 0);
    const isLoopback =
        groups.slice(0, IPV6_GROUP_COUNT - 1).every((group) => group === 0) &&
        groups[IPV6_GROUP_COUNT - 1] === 1;
    const isUniqueLocal = (firstGroup & 0xfe_00) === 0xfc_00;
    const isLinkLocal = (firstGroup & 0xff_c0) === 0xfe_80;

    return isUnspecified || isLoopback || isUniqueLocal || isLinkLocal;
}

function normalizeHostname(hostname: string): string {
    const normalized = hostname.trim().toLowerCase();
    if (normalized.startsWith("[") && normalized.endsWith("]")) {
        return normalized.slice(1, -1);
    }
    return normalized;
}

function parseIpv6Address(hostname: string): number[] | null {
    const [head = "", tail = "", ...extra] = hostname.split("::");
    if (extra.length > 0) {
        return null;
    }

    const headParts = head ? head.split(":") : [];
    const tailParts = tail ? tail.split(":") : [];
    const missingPartCount = hostname.includes("::")
        ? IPV6_GROUP_COUNT - headParts.length - tailParts.length
        : 0;

    if (missingPartCount < 0) {
        return null;
    }

    const parts = [
        ...headParts,
        ...Array.from({ length: missingPartCount }, () => "0"),
        ...tailParts,
    ];
    if (parts.length !== IPV6_GROUP_COUNT) {
        return null;
    }

    const groups: number[] = [];
    for (const part of parts) {
        if (!IPV6_GROUP_PATTERN.test(part)) {
            return null;
        }
        groups.push(Number.parseInt(part, 16));
    }
    return groups;
}

function getMappedIpv4Address(groups: number[]): string | null {
    const mappedPrefixIndex = 5;
    const firstIpv4Group = groups[6];
    const secondIpv4Group = groups[7];
    if (firstIpv4Group === undefined || secondIpv4Group === undefined) {
        return null;
    }

    const hasMappedPrefix =
        groups.slice(0, mappedPrefixIndex).every((group) => group === 0) &&
        groups[mappedPrefixIndex] === 0xff_ff;

    if (!hasMappedPrefix) {
        return null;
    }

    return [
        firstIpv4Group >> 8,
        firstIpv4Group & 0xff,
        secondIpv4Group >> 8,
        secondIpv4Group & 0xff,
    ].join(".");
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
