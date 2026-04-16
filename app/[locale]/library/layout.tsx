import { NuqsAdapter } from "nuqs/adapters/next/app";
import * as React from "react";

export default function LibraryLayout({ children }: React.PropsWithChildren) {
    return (
        <React.Suspense>
            <NuqsAdapter>{children}</NuqsAdapter>
        </React.Suspense>
    );
}
