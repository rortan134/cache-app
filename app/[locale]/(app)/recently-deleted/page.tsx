import { buildPageMetadata } from "@/app/metadata";
import { RecentlyDeletedList } from "@/components/recently-deleted/recently-deleted-list";
import { ApplicationSidebar } from "@/components/sidebar/application-sidebar";
import { getServerSession } from "@/lib/auth/session";
import { listRecentlyDeletedItems } from "@/lib/collections/service";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { T } from "gt-next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const instant = false;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return buildPageMetadata({
        description: gtPublicString(
            locale,
            "recently-deleted.metadata.description",
            "Items you remove from your library live here for 30 days before being deleted forever."
        ),
        locale,
        path: "/recently-deleted",
        title: gtPublicString(
            locale,
            "recently-deleted.metadata.title",
            "Recently deleted"
        ),
    });
}

export default async function RecentlyDeletedPage() {
    await connection();

    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const items = await listRecentlyDeletedItems({ userId });

    return (
        <>
            <ApplicationSidebar />
            <div className="relative z-0 flex w-full min-w-0 flex-1 flex-col gap-4 p-8">
                <header className="flex items-end justify-between gap-4 border-border border-b pb-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="font-semibold text-foreground text-xl">
                            <T>Recently deleted</T>
                        </h1>
                        <p className="text-muted-foreground text-xs">
                            <T>
                                Restored items go back to your library with
                                their collections and previews intact. Items
                                left here are deleted forever after 30 days.
                            </T>
                        </p>
                    </div>
                </header>
                <RecentlyDeletedList
                    itemDaysRemainingById={Object.fromEntries(
                        items.map((entry) => [
                            entry.item.id,
                            {
                                daysRemaining: entry.daysRemaining,
                                deletedAt: entry.deletedAt.toISOString(),
                            },
                        ])
                    )}
                    items={items.map((entry) => entry.item)}
                />
            </div>
        </>
    );
}
