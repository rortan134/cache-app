import { APP_NAME } from "@/lib/common/constants";
import { getLocales } from "gt-next/server";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import * as React from "react";

export function generateStaticParams() {
    return getLocales().map((locale) => ({ locale }));
}

export function generateMetadata(): Metadata {
    return {
        description: APP_NAME,
    };
}

export default function LocaleLayout({ children }: React.PropsWithChildren) {
    return (
        <React.Suspense>
            <NuqsAdapter>{children}</NuqsAdapter>
        </React.Suspense>
    );
}
