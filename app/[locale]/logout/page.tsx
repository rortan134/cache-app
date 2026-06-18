import { buildPageMetadata } from "@/app/metadata";
import { PageShell } from "@/components/ui/page-shell";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import type { Metadata } from "next";
import { LogoutPageClient } from "./client";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return {
        ...buildPageMetadata({
            description: gtPublicString(
                locale,
                "logout.metadata.description",
                "Signing you out securely."
            ),
            keywords: ["sign out", "logout", "Cache App"],
            locale,
            path: "/logout",
            title: gtPublicString(locale, "logout.metadata.title", "Sign out"),
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
            <LogoutPageClient />
        </PageShell>
    );
}
