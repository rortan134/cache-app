import { buildPageMetadata } from "@/app/metadata";
import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { ReviewDigest } from "@/components/review/digest";
import { ActivePathname } from "@/components/ui/active-pathname";
import { PageShell } from "@/components/ui/page-shell";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
} from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/session";
import { userHasActiveSubscription } from "@/lib/billing/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { getReviewData } from "@/lib/review/service";
import { T } from "gt-next";
import { Compass, History, House } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
                <Sidebar>
                    <SidebarHeader className="gap-3">
                        <UserMenu>
                            <UserMenuHeader />
                            <UserMenuContent />
                            <UserMenuFooter />
                        </UserMenu>
                        <SidebarGroup>
                            <Link className="contents" href="/library" prefetch>
                                <ActivePathname href="/library">
                                    <SidebarItem>
                                        <House
                                            aria-hidden
                                            className="inline-block size-4 shrink-0"
                                            focusable="false"
                                        />
                                        <span>
                                            <T>Home</T>
                                        </span>
                                    </SidebarItem>
                                </ActivePathname>
                            </Link>
                            <Link className="contents" href="/review" prefetch>
                                <ActivePathname href="/review">
                                    <SidebarItem>
                                        <Compass
                                            aria-hidden
                                            className="inline-block size-4 shrink-0"
                                            focusable="false"
                                        />
                                        <span>
                                            <T>Review</T>
                                        </span>
                                    </SidebarItem>
                                </ActivePathname>
                            </Link>
                            <Link
                                className="contents"
                                href="/activity"
                                prefetch
                            >
                                <ActivePathname href="/activity">
                                    <SidebarItem>
                                        <History
                                            aria-hidden
                                            className="inline-block size-4 shrink-0"
                                            focusable="false"
                                        />
                                        <span>
                                            <T>Activity</T>
                                        </span>
                                    </SidebarItem>
                                </ActivePathname>
                            </Link>
                        </SidebarGroup>
                    </SidebarHeader>
                </Sidebar>
                <div className="flex w-full flex-1 flex-col overflow-hidden">
                    <ReviewDigest
                        collections={collections}
                        hasAccess={hasAccess}
                        initialItems={items}
                    />
                </div>
            </div>
        </PageShell>
    );
}
