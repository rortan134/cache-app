import { appendVaryAccept, negotiateContentType } from "@/lib/common/accept";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/common/constants";
import { createNextMiddleware } from "gt-next/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HTML_MEDIA_TYPE = "text/html";
const MARKDOWN_MEDIA_TYPE = "text/markdown";
const XML_MEDIA_TYPE = "application/xml";
const TEXT_XML_MEDIA_TYPE = "text/xml";
const MARKDOWN_ROUTE = "/api/markdown";
const TEXT_XML_SITEMAP_ROUTE = "/api/sitemap";
const HOMEPAGE_MEDIA_TYPES = [HTML_MEDIA_TYPE, MARKDOWN_MEDIA_TYPE] as const;
const SITEMAP_MEDIA_TYPES = [
    XML_MEDIA_TYPE,
    TEXT_XML_MEDIA_TYPE,
    MARKDOWN_MEDIA_TYPE,
] as const;
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
        const response = resolveDocumentRepresentation(request, isSitemap);
        if (response) {
            return response;
        }
    }

    const response = await gtMiddleware(request);
    if (isHomepage) {
        appendVaryAccept(response.headers);
    }

    return response;
}

function resolveDocumentRepresentation(
    request: NextRequest,
    isSitemap: boolean
): Response | null {
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
            : `${MARKDOWN_ROUTE}/home/${getHomepageLocale(
                  request.nextUrl.pathname
              )}`;

        const response = NextResponse.rewrite(url);
        appendVaryAccept(response.headers);
        return response;
    }

    if (preferredType === TEXT_XML_MEDIA_TYPE) {
        const url = request.nextUrl.clone();
        url.pathname = TEXT_XML_SITEMAP_ROUTE;

        const response = NextResponse.rewrite(url);
        appendVaryAccept(response.headers);
        return response;
    }

    if (isSitemap) {
        const response = NextResponse.next();
        appendVaryAccept(response.headers);
        return response;
    }

    return null;
}

function createNotAcceptableResponse(isSitemap: boolean): Response {
    const availableTypes = (
        isSitemap ? SITEMAP_MEDIA_TYPES : HOMEPAGE_MEDIA_TYPES
    ).join(", ");

    return new Response(`Not Acceptable\n\nAvailable: ${availableTypes}\n`, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept",
        },
        status: 406,
    });
}

function isHomepagePath(pathname: string): boolean {
    const normalizedPathname = normalizeHomepagePathname(pathname);
    if (normalizedPathname === "/") {
        return true;
    }

    const locale = normalizedPathname.slice(1);
    return SUPPORTED_LOCALES.some(
        (supportedLocale) => locale === supportedLocale
    );
}

function getHomepageLocale(pathname: string): string {
    const locale = normalizeHomepagePathname(pathname).slice(1);
    return (
        SUPPORTED_LOCALES.find(
            (supportedLocale) => locale === supportedLocale
        ) ?? DEFAULT_LOCALE
    );
}

function normalizeHomepagePathname(pathname: string): string {
    return pathname.length > 1 && pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
}

export const config = {
    matcher: [
        "/sitemap.xml",
        "/((?!api/|mcp(?:/|$)|static/|_next/|_vercel/|.well-known/workflow/|[^/]+\\.[^/]+$).*)",
    ],
};
