import "server-only";

import { readJsonOrNull } from "@/lib/common/net";
import { IntegrationApiError } from "@/lib/integrations/error";
import * as z from "zod";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";

export const NOTION_API_VERSION = "2026-03-11";

const NotionApiErrorSchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
});

const NotionCreatePageResponseSchema = z.object({
    url: z.string().url(),
});

export interface NotionCreatedPage {
    pageUrl: string;
}

function parseNotionApiError(
    payload: unknown,
    status: number,
    operation: string
): IntegrationApiError {
    const parsed = NotionApiErrorSchema.safeParse(payload);
    const message =
        parsed.data?.message ||
        `Notion API request failed with status ${status}.`;

    return new IntegrationApiError({
        cause: payload,
        integrationId: "notion",
        message,
        operation,
        status,
    });
}

async function fetchNotion(
    accessToken: string,
    path: string,
    init: RequestInit,
    operation: string
): Promise<unknown> {
    const response = await fetch(`${NOTION_API_BASE_URL}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_API_VERSION,
            ...init.headers,
        },
    });

    const payload = await readJsonOrNull(response);
    if (!response.ok) {
        throw parseNotionApiError(payload, response.status, operation);
    }

    return payload;
}

export async function createNotionMarkdownPage(args: {
    accessToken: string;
    markdown: string;
    title: string;
}): Promise<NotionCreatedPage> {
    const payload = await fetchNotion(
        args.accessToken,
        "/pages",
        {
            body: JSON.stringify({
                markdown: args.markdown,
                properties: {
                    title: {
                        title: [
                            {
                                text: {
                                    content: args.title,
                                },
                            },
                        ],
                    },
                },
            }),
            method: "POST",
        },
        "createNotionMarkdownPage"
    );

    const parsed = NotionCreatePageResponseSchema.safeParse(payload);
    if (!parsed.success) {
        throw new IntegrationApiError({
            cause: payload,
            integrationId: "notion",
            message: "Notion created a page but did not return a page URL.",
            operation: "createNotionMarkdownPage",
            status: 502,
        });
    }

    return {
        pageUrl: parsed.data.url,
    };
}
