import "@/lib/dayjs/locales";

import { APP_NAME, BASE_URL, SITE_DEFAULT_TITLE } from "@/lib/common/constants";
import { INTEGRATIONS } from "@/lib/integrations/support";
import { GTProvider, getLocale } from "gt-next/server";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import * as React from "react";
import "./globals.css";

export async function generateMetadata(props: {
    params: Promise<{ locale?: string }>;
}): Promise<Metadata> {
    const { locale: localeParam } = await props.params;
    const locale = localeParam ?? (await getLocale());

    return {
        applicationName: APP_NAME,
        authors: [{ name: APP_NAME }],
        category: "technology",
        classification: "AI Development Tools",
        creator: APP_NAME,
        formatDetection: {
            address: false,
            email: false,
            telephone: false,
        },
        keywords: ["bookmarks", "bookmark manager"],
        metadataBase: new URL(BASE_URL),
        openGraph: {
            locale,
            siteName: APP_NAME,
            type: "website",
            url: BASE_URL,
        },
        other: {
            "llm:content-type": "",
            "llm:integrations": INTEGRATIONS.map((int) => int.label).join(", "),
            "llm:languages": "en",
            "llm:pricing": "free tier available, pro 8€/month",
            "llm:region": "global",
            "llm:use-cases": "",
        },
        publisher: APP_NAME,
        referrer: "origin-when-cross-origin",
        robots: {
            follow: true,
            googleBot: {
                follow: true,
                index: true,
                "max-image-preview": "large",
                "max-snippet": -1,
                "max-video-preview": -1,
                noimageindex: false,
            },
            index: true,
            nocache: false,
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
    maximumScale: 1,
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
            className={`${inter.variable} scrollbar-gutter-stable h-full antialiased`}
            dir="ltr"
            lang={locale}
            suppressHydrationWarning
        >
            <head>
                {/* Pinterest verification */}
                <meta
                    content="9c251d927955d913b23e047ef08ed572"
                    name="p:domain_verify"
                />
            </head>
            <body className="flex flex-col antialiased">
                <h1 className="sr-only">{APP_NAME}</h1>
                <a className="skip-to-content" href="#main-content">
                    Skip to main content
                </a>
                <React.Suspense>
                    <GTProvider>{props.children}</GTProvider>
                </React.Suspense>
            </body>
        </html>
    );
}
