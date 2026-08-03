import { appendVaryAccept, negotiateContentType } from "@/lib/common/accept";
import {
    DEFAULT_LOCALE,
    MIME_TYPES,
    SUPPORTED_LOCALES,
    type SupportedLocale,
} from "@/lib/common/constants";
import { createNextMiddleware } from "gt-next/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HTML_MEDIA_TYPE = MIME_TYPES.html;
const MARKDOWN_MEDIA_TYPE = MIME_TYPES.markdown;
const XML_MEDIA_TYPE = MIME_TYPES.xml;
const TEXT_XML_MEDIA_TYPE = MIME_TYPES.textXml;
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
    const homepageLocale = getHomepageLocale(pathname);
    const isHomepage = homepageLocale !== null;
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
        const response = resolveDocumentRepresentation(
            request,
            isSitemap,
            homepageLocale
        );
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
    isSitemap: boolean,
    homepageLocale: SupportedLocale | null
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
            : `${MARKDOWN_ROUTE}/home/${homepageLocale ?? DEFAULT_LOCALE}`;

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

function getHomepageLocale(pathname: string): SupportedLocale | null {
    const normalizedPathname = normalizeHomepagePathname(pathname);
    if (normalizedPathname === "/") {
        return DEFAULT_LOCALE;
    }

    const locale = normalizedPathname.slice(1);
    return (
        SUPPORTED_LOCALES.find(
            (supportedLocale) => locale === supportedLocale
        ) ?? null
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
