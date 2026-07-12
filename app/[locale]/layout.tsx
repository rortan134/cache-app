import "@/lib/dayjs/locales";

import { ShortcutsProvider } from "@/components/ui/shortcuts";
import { APP_NAME, BASE_URL, SITE_DEFAULT_TITLE } from "@/lib/common/constants";
import { INTEGRATIONS } from "@/lib/integrations/support";
import { GTProvider, getLocales } from "gt-next";
import { getLocale } from "gt-next/server";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type * as React from "react";
import "../globals.css";

export function generateStaticParams() {
    return getLocales().map((locale) => ({ locale }));
}

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
            },
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
    maximumScale: 1,
    viewportFit: "cover",
    width: "device-width",
};

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export default async function LocaleLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;

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
            <body>
                <span aria-atomic="true" aria-live="polite" className="sr-only">
                    {APP_NAME}
                </span>
                <div className="not-has-focus-visible:sr-only pointer-events-none fixed inset-x-0 top-0 z-50 mt-4 flex select-none justify-center">
                    <a
                        className="pointer-events-auto rounded-2xl bg-background px-4 py-2 text-base text-foreground outline-2 outline-offset-2 focus-visible:outline focus-visible:outline-black print:hidden"
                        href="#main-content"
                    >
                        Skip to content
                    </a>
                </div>
                <GTProvider>
                    <ShortcutsProvider>{props.children}</ShortcutsProvider>
                </GTProvider>
            </body>
        </html>
    );
}
