import { PageShell } from "@/components/ui/page-shell";
import { APP_NAME } from "@/lib/constants";
import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import { T } from "gt-next";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        alternates: buildLocaleAlternates("/security"),
        description: `Security for ${APP_NAME}.`,
        title: "Security",
    };
}

export default function SecurityPage() {
    return (
        <PageShell>
            <article className="flex flex-col gap-8 text-[0.95rem] leading-relaxed">
                <section>
                    <h1>
                        <T>Security</T>
                    </h1>
                </section>
            </article>
        </PageShell>
    );
}
