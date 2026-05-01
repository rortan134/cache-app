import { getLocales } from "gt-next/server";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import * as React from "react";

export function generateStaticParams() {
    return getLocales().map((locale) => ({ locale }));
}

export default function LocaleLayout({ children }: React.PropsWithChildren) {
    return (
        <React.Suspense>
            <NuqsAdapter>{children}</NuqsAdapter>
        </React.Suspense>
    );
}
