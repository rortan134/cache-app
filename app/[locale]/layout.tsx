import { SITE_APP_NAME } from "@/lib/constants";
import { getLocales } from "gt-next/server";
import type { Metadata } from "next";
import * as React from "react";

export function generateStaticParams() {
    return getLocales().map((locale) => ({ locale }));
}

export function generateMetadata(): Metadata {
    return {
        description: SITE_APP_NAME,
    };
}

export default function LocaleLayout({ children }: React.PropsWithChildren) {
    return <React.Suspense>{children}</React.Suspense>;
}
