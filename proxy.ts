import { appendVaryAccept, negotiateContentType } from "@/lib/common/accept";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/common/constants";
import { createNextMiddleware } from "gt-next/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HTML_MEDIA_TYPE = "text/html";
const MARKDOWN_MEDIA_TYPE = "text/markdown";
const XML_MEDIA_TYPE = "application/xml";
const MARKDOWN_ROUTE = "/api/markdown";
const HOMEPAGE_MEDIA_TYPES = [HTML_MEDIA_TYPE, MARKDOWN_MEDIA_TYPE] as const;
const SITEMAP_MEDIA_TYPES = [XML_MEDIA_TYPE, MARKDOWN_MEDIA_TYPE] as const;
const gtMiddleware = createNextMiddleware();

export default async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const isHomepage = isHomepagePath(pathname);
    const isSitemap = pathname === "/sitemap.xml";
    // RSC navigations use a private representation and must reach the page
    // renderer instead of being treated as document negotiation.
    const isRscRequest =
        isHomepage &&
        request.headers
            .get("accept")
            ?.toLowerCase()
            .includes("text/x-component");

    if ((isHomepage || isSitemap) && !isRscRequest) {
        const defaultMediaType = isSitemap ? XML_MEDIA_TYPE : HTML_MEDIA_TYPE;
        const preferredType = negotiateContentType(
            request.headers.get("accept"),
            isSitemap ? SITEMAP_MEDIA_TYPES : HOMEPAGE_MEDIA_TYPES,
            defaultMediaType
        );

        if (preferredType === null) {
            return createNotAcceptableResponse(isSitemap);
        }

        if (preferredType === MARKDOWN_MEDIA_TYPE) {
            const url = request.nextUrl.clone();
            url.pathname = isSitemap
                ? `${MARKDOWN_ROUTE}/sitemap`
                : `${MARKDOWN_ROUTE}/home/${getHomepageLocale(pathname)}`;

            const response = NextResponse.rewrite(url);
            appendVaryAccept(response.headers);
            return response;
        }

        if (isSitemap) {
            const response = NextResponse.next();
            appendVaryAccept(response.headers);
            return response;
        }
    }

    const response = await gtMiddleware(request);
    if (isHomepage) {
        appendVaryAccept(response.headers);
    }

    return response;
}

function createNotAcceptableResponse(isSitemap: boolean): Response {
    const availableTypes = isSitemap
        ? "application/xml, text/markdown"
        : "text/html, text/markdown";

    return new Response(`Not Acceptable\n\nAvailable: ${availableTypes}\n`, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept",
        },
        status: 406,
    });
}

function isHomepagePath(pathname: string): boolean {
    if (pathname === "/") {
        return true;
    }

    const locale = pathname.slice(1);
    return SUPPORTED_LOCALES.some(
        (supportedLocale) => locale === supportedLocale
    );
}

function getHomepageLocale(pathname: string): string {
    const locale = pathname.slice(1);
    return (
        SUPPORTED_LOCALES.find(
            (supportedLocale) => locale === supportedLocale
        ) ?? DEFAULT_LOCALE
    );
}

export const config = {
    matcher: [
        "/sitemap.xml",
        "/((?!api/|mcp(?:/|$)|static/|_next/|_vercel/|.well-known/workflow/|[^/]+\\.[^/]+$).*)",
    ],
};
