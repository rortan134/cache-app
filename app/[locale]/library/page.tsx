import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { IntegrationsList } from "@/components/library/entry/integrations-list";
import { LibraryWorkspace } from "@/components/library/library-workspace";
import { LogoContextMenu } from "@/components/ui/logo-context-menu";
import { PageShell } from "@/components/ui/page-shell";
import { buildLocaleAlternates } from "@/lib/alternates";
import { getServerSession } from "@/lib/auth/server";
import { gtPublicString } from "@/lib/gt-public-json";
import { INTEGRATIONS } from "@/lib/integrations/supports";
import { getLibraryItemsForUser } from "@/lib/library/get-library-items";
import { prisma } from "@/prisma";
import { LibraryItemSource } from "@/prisma/client/enums";
import LogoIconImage from "@/public/cache-app-icon.png";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return {
        alternates: buildLocaleAlternates("/library"),
        description: gtPublicString(
            locale,
            "library.metadata.description",
            "Saved items from your connected accounts and extension imports appear below by source.",
        ),
        title: gtPublicString(locale, "library.metadata.title", "My library"),
    };
}

export default async function LibraryPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const isXParked = !(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);

    const [{ collections, items }, linkedAccounts] = await Promise.all([
        getLibraryItemsForUser(userId),
        prisma.account.findMany({
            select: { providerId: true },
            where: {
                providerId: {
                    in: ["google", "pinterest", "x"],
                },
                userId,
            },
        }),
    ]);

    const linkedProviderIds = new Set(
        linkedAccounts.map((account) => account.providerId),
    );

    const isIntegrationConnected = (
        id: (typeof INTEGRATIONS)[number]["id"],
    ) => {
        if (id === "google-photos") {
            return linkedProviderIds.has("google");
        }
        if (id === "pinterest") {
            return linkedProviderIds.has("pinterest");
        }
        if (id === "chrome") {
            return items.some(
                (item) => item.source === LibraryItemSource.chrome_bookmarks,
            );
        }
        if (id === "x") {
            return linkedProviderIds.has("x");
        }
        if (id === "youtube") {
            return items.some(
                (item) => item.source === LibraryItemSource.youtube_watch_later,
            );
        }
        return false;
    };

    const connectedIntegrationIDs = INTEGRATIONS.flatMap(({ id }) =>
        isIntegrationConnected(id) ? [id] : [],
    );

    const parkedIntegrationIds = INTEGRATIONS.flatMap(({ id }) => {
        if (id === "x" && isXParked) {
            return [id];
        }
        return [];
    });

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <LibraryWorkspace
                    initialCollections={collections}
                    initialItems={items}
                    locale={locale}
                    sidebarBottom={
                        <UserMenu>
                            <UserMenuHeader />
                            <UserMenuContent />
                            <UserMenuFooter />
                        </UserMenu>
                    }
                    sidebarHeader={
                        <>
                            <LogoContextMenu
                                href="/library"
                                src={LogoIconImage}
                            />
                            <IntegrationsList
                                items={items}
                                parkedIntegrationIds={parkedIntegrationIds}
                                serverConnectedIntegrationIds={
                                    connectedIntegrationIDs
                                }
                            />
                        </>
                    }
                />
            </div>
        </PageShell>
    );
}
