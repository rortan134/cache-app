import { buildPageMetadata } from "@/app/metadata";
import { PageShell } from "@/components/ui/page-shell";
import { getGT } from "gt-next/server";
import type { Metadata } from "next";
import * as React from "react";
import { LogoutPageClient } from "./client";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const gt = await getGT();

    return {
        ...buildPageMetadata({
            description: gt("Signing you out securely."),
            keywords: ["sign out", "logout", "Cache App"],
            locale,
            path: "/logout",
            title: gt("Sign out"),
        }),
        robots: {
            follow: false,
            index: false,
        },
    };
}

export default function LogoutPage() {
    return (
        <PageShell>
            <React.Suspense fallback={null}>
                <LogoutPageClient />
            </React.Suspense>
        </PageShell>
    );
}
