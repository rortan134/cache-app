import { APP_NAME } from "@/lib/common/constants";
import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        alternates: buildLocaleAlternates("/legal/cookie-policy"),
        description: `Cookie Policy for ${APP_NAME}.`,
        title: "Cookie Policy",
    };
}

export default function CookiePolicyPage() {
    return (
        <article className="flex flex-col gap-4 text-stone-800">
            <h1 className="font-semibold text-2xl text-stone-950 tracking-tight">
                Cookie Policy
            </h1>
            <p className="text-[0.95rem] leading-relaxed">
                Placeholder content. Final cookie policy will be published here.
            </p>
        </article>
    );
}
