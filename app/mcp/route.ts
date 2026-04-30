import { BASE_URL } from "@/lib/common/constants";
import { createMcpHandler } from "mcp-handler";
import * as z from "zod";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
    const result = await fetch(`${baseUrl}${path}`);
    return await result.text();
};

interface ContentWidget {
    description: string;
    html: string;
    id: string;
    invoked: string;
    invoking: string;
    templateUri: string;
    title: string;
    widgetDomain: string;
}

function widgetMeta(widget: ContentWidget) {
    return {
        "openai/outputTemplate": widget.templateUri,
        "openai/resultCanProduceWidget": true,
        "openai/toolInvocation/invoked": widget.invoked,
        "openai/toolInvocation/invoking": widget.invoking,
        "openai/widgetAccessible": false,
    } as const;
}

const handler = createMcpHandler(async (server) => {
    const html = await getAppsSdkCompatibleHtml(BASE_URL, "/");

    const contentWidget: ContentWidget = {
        description: "Displays the homepage content",
        html,
        id: "show_content",
        invoked: "Content loaded",
        invoking: "Loading content...",
        templateUri: "ui://widget/content-template.html",
        title: "Show Content",
        widgetDomain: BASE_URL,
    };

    server.registerResource(
        "content-widget",
        contentWidget.templateUri,
        {
            _meta: {
                "openai/widgetDescription": contentWidget.description,
                "openai/widgetPrefersBorder": true,
            },
            description: contentWidget.description,
            mimeType: "text/html+skybridge",
            title: contentWidget.title,
        },
        async (uri) => ({
            contents: [
                {
                    _meta: {
                        "openai/widgetDescription": contentWidget.description,
                        "openai/widgetDomain": contentWidget.widgetDomain,
                        "openai/widgetPrefersBorder": true,
                    },
                    mimeType: "text/html+skybridge",
                    text: `<html>${contentWidget.html}</html>`,
                    uri: uri.href,
                },
            ],
        })
    );

    server.registerTool(
        contentWidget.id,
        {
            _meta: widgetMeta(contentWidget),
            description:
                "Fetch and display the homepage content with the name of the user",
            inputSchema: {
                // @ts-expect-error TODO: fix types
                name: z
                    .string()
                    .describe(
                        "The name of the user to display on the homepage"
                    ),
            },
            title: contentWidget.title,
        },
        // @ts-expect-error TODO: fix types
        async ({ name }) =>
            await Promise.resolve({
                _meta: widgetMeta(contentWidget),
                content: [
                    {
                        text: name,
                        type: "text",
                    },
                ],
                structuredContent: {
                    name,
                    timestamp: new Date().toISOString(),
                },
            })
    );
});

export const GET = handler;
export const POST = handler;
