import "@/lib/dayjs/locales";

import { APP_NAME, BASE_URL, SITE_DEFAULT_TITLE } from "@/lib/common/constants";
import { getOwnerDocument } from "@/lib/common/dom";
import { Analytics } from "@vercel/analytics/next";
import { GTProvider, getLocale } from "gt-next/server";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import * as React from "react";
import "./globals.css";

export async function generateMetadata(props: {
    params: Promise<{ locale?: string }>;
}): Promise<Metadata> {
    const { locale: localeParam } = await props.params;
    const locale = localeParam ?? (await getLocale());

    return {
        applicationName: APP_NAME,
        keywords: ["bookmark", "bookmark manager"],
        metadataBase: new URL(BASE_URL),
        openGraph: {
            locale,
            siteName: APP_NAME,
            type: "website",
            url: BASE_URL,
        },
        robots: {
            follow: true,
            index: true,
        },
        title: {
            default: SITE_DEFAULT_TITLE,
            template: `%s | ${APP_NAME}`,
        },
        twitter: {
            card: "summary_large_image",
        },
    };
}

export const viewport: Viewport = {
    initialScale: 1,
    viewportFit: "cover",
    width: "device-width",
};

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export default async function RootLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale?: string }>;
}) {
    const { locale: localeParam } = await props.params;
    const locale = localeParam ?? (await getLocale());

    return (
        <html
            className={`${inter.variable} h-full antialiased [scrollbar-gutter:stable]`}
            dir="ltr"
            lang={locale}
            suppressHydrationWarning
        >
            <head>
                <NextChatSDKBootstrap baseUrl={BASE_URL} />
                <meta content="scale" name="text-scale" />
                <meta
                    content="text/html; charset=utf-8"
                    httpEquiv="Content-Type"
                />
                <meta content="x402" name="apple-mobile-web-app-title" />
                <meta
                    content="9c251d927955d913b23e047ef08ed572"
                    name="p:domain_verify"
                />
                {process.env.NODE_ENV === "development" && (
                    <Script
                        crossOrigin="anonymous"
                        src="//unpkg.com/react-scan/dist/auto.global.js"
                        strategy="beforeInteractive"
                    />
                )}
            </head>
            <body className="flex flex-col antialiased">
                <h1 className="sr-only">{APP_NAME}</h1>
                <a className="skip-to-content" href="#main-content">
                    Skip to main content
                </a>
                <React.Suspense>
                    <GTProvider>{props.children}</GTProvider>
                </React.Suspense>
                <Analytics />
            </body>
        </html>
    );
}

function NextChatSDKBootstrap({ baseUrl }: { baseUrl: string }) {
    return (
        <>
            <base href={baseUrl} />
            <script>{`window.innerBaseUrl = ${JSON.stringify(baseUrl)}`}</script>
            <script>{`window.__isChatGptApp = typeof window.openai !== "undefined";`}</script>
            <script>
                {"(" +
                    (() => {
                        const baseUrl = window.innerBaseUrl;
                        if (baseUrl === undefined) {
                            return;
                        }
                        const htmlElement = getOwnerDocument().documentElement;
                        const observer = new MutationObserver((mutations) => {
                            for (const mutation of mutations) {
                                if (
                                    mutation.type === "attributes" &&
                                    mutation.target === htmlElement
                                ) {
                                    const attrName = mutation.attributeName;
                                    if (
                                        attrName &&
                                        attrName !== "suppresshydrationwarning"
                                    ) {
                                        htmlElement.removeAttribute(attrName);
                                    }
                                }
                            }
                        });
                        observer.observe(htmlElement, {
                            attributeOldValue: true,
                            attributes: true,
                        });

                        const originalReplaceState = history.replaceState;
                        history.replaceState = (state, unused, url) => {
                            const u = new URL(url ?? "", window.location.href);
                            const href = u.pathname + u.search + u.hash;
                            originalReplaceState.call(
                                history,
                                state,
                                unused,
                                href
                            );
                        };

                        const originalPushState = history.pushState;
                        history.pushState = (state, unused, url) => {
                            const u = new URL(url ?? "", window.location.href);
                            const href = u.pathname + u.search + u.hash;
                            originalPushState.call(
                                history,
                                state,
                                unused,
                                href
                            );
                        };

                        const appOrigin = new URL(baseUrl).origin;
                        const isInIframe = window.self !== window.top;

                        window.addEventListener(
                            "click",
                            (e) => {
                                const el =
                                    e.target instanceof Element
                                        ? e.target
                                        : null;
                                const a = el?.closest("a");
                                if (!a?.href) {
                                    return;
                                }
                                const url = new URL(
                                    a.href,
                                    window.location.href
                                );
                                if (
                                    url.origin !== window.location.origin &&
                                    url.origin !== appOrigin
                                ) {
                                    try {
                                        if (window.openai) {
                                            window.openai.openExternal({
                                                href: a.href,
                                            });
                                            e.preventDefault();
                                        }
                                    } catch {
                                        console.warn(
                                            "openExternal failed, likely not in OpenAI client"
                                        );
                                    }
                                }
                            },
                            true
                        );

                        if (
                            isInIframe &&
                            window.location.origin !== appOrigin
                        ) {
                            const originalFetch = window.fetch;

                            function resolveFetchUrl(
                                input: URL | RequestInfo,
                                baseHref: string
                            ): URL {
                                if (
                                    typeof input === "string" ||
                                    input instanceof URL
                                ) {
                                    return new URL(input, baseHref);
                                }
                                return new URL(input.url, baseHref);
                            }

                            function inputForResolvedUrl(
                                input: URL | RequestInfo,
                                url: URL
                            ): URL | RequestInfo {
                                if (
                                    typeof input === "string" ||
                                    input instanceof URL
                                ) {
                                    return url.toString();
                                }
                                return new Request(url.toString(), input);
                            }

                            window.fetch = Object.assign(
                                (
                                    input: URL | RequestInfo,
                                    init?: RequestInit
                                ): Promise<Response> => {
                                    const url = resolveFetchUrl(
                                        input,
                                        window.location.href
                                    );

                                    if (url.origin === appOrigin) {
                                        return originalFetch.call(
                                            window,
                                            inputForResolvedUrl(input, url),
                                            { ...init, mode: "cors" }
                                        );
                                    }

                                    if (url.origin === window.location.origin) {
                                        const rewritten = new URL(baseUrl);
                                        rewritten.pathname = url.pathname;
                                        rewritten.search = url.search;
                                        rewritten.hash = url.hash;
                                        return originalFetch.call(
                                            window,
                                            inputForResolvedUrl(
                                                input,
                                                rewritten
                                            ),
                                            { ...init, mode: "cors" }
                                        );
                                    }

                                    return originalFetch.call(
                                        window,
                                        input,
                                        init
                                    );
                                },
                                {
                                    preconnect: () => {
                                        // No-op
                                    },
                                }
                            );
                        }
                    }).toString() +
                    ")()"}
            </script>
        </>
    );
}
