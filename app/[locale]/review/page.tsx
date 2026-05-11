import { buildPageMetadata } from "@/app/metadata";
import { ReviewDigest } from "@/components/review/digest";
import { ApplicationSidebar } from "@/components/ui/application-sidebar";
import { PageShell } from "@/components/ui/page-shell";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/session";
import { userHasActiveSubscription } from "@/lib/billing/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { getReviewData } from "@/lib/review/service";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
                "review.metadata.description",
                "Review uncollected items from your library and organize them into collections."
            ),
            keywords: ["review", "organize", "uncollected", "Cache App"],
            locale,
            path: "/review",
            title: gtPublicString(locale, "review.metadata.title", "Review"),
        }),
    };
}

export default async function ReviewPage() {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const hasAccess = await userHasActiveSubscription(userId);

    const { collections, items } = await getReviewData({ userId });

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <SidebarProvider>
                    <ApplicationSidebar />
                    <div className="flex w-full flex-1 flex-col overflow-hidden">
                        <ReviewDigest
                            collections={collections}
                            hasAccess={hasAccess}
                            initialItems={items}
                        />
                    </div>
                </SidebarProvider>
            </div>
        </PageShell>
    );
}
