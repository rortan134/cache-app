import { buildLocaleAlternates } from "@/lib/i18n/alternates";
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
        alternates: buildLocaleAlternates("/logout"),
        description: gtPublicString(
            locale,
            "logout.metadata.description",
            "You are being signed out securely."
        ),
        title: gtPublicString(locale, "logout.metadata.title", "Sign out"),
    };
}

export default function LogoutPage() {
    return <LogoutPageClient />;
}
