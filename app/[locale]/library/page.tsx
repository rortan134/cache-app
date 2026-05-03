import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { Root } from "@/components/library/browser";
import { CollectionsListRoot } from "@/components/library/collections";
import {
    IntegrationsList,
    IntegrationsListItem,
    IntegrationsListItemAction,
    IntegrationsListNoticeCallout,
    IntegrationsListPanel,
    IntegrationsListTrigger,
} from "@/components/library/integrations";
import { WorkspaceProvider } from "@/components/library/workspace-provider";
import { ActivePathname } from "@/components/ui/active-pathname";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";
import {
    Sidebar,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
} from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/server";
import { userHasActiveSubscription } from "@/lib/auth/subscription-access";
import {
    LIBRARY_COLLECTION_TAG_SELECT,
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    toLibraryCollectionSummary,
    type LibraryCollectionSummary,
    type LibraryItemWithCollections,
} from "@/lib/collections/utils";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import {
    INTEGRATIONS,
    listConnectedIntegrationIds,
    listIntegrationAccountProviderIds,
} from "@/lib/integrations/support";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { prisma } from "@/prisma";
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

    return buildPageMetadata({
        description: gtPublicString(
            locale,
            "library.metadata.description",
            "Saved items from your connected accounts and extension imports appear below by source."
        ),
        keywords: [
            "my library",
            "saved content",
            "bookmark library",
            "collections",
            "Cache App",
        ],
        locale,
        path: "/library",
        title: gtPublicString(locale, "library.metadata.title", "My library"),
    });
}

const FREE_LIBRARY_PREVIEW_ITEMS = 12;

async function getUserLibraryPageData(args: {
    hasAccess: boolean;
    userId: string;
}) {
    const { hasAccess, userId } = args;
    const itemWhere = {
        kind: {
            not: "folder" as const,
        },
        userId,
    };
    const collectionsPromise = prisma.collection.findMany({
        orderBy: {
            name: "asc",
        },
        select: {
            _count: {
                select: {
                    items: true,
                },
            },
            ...LIBRARY_COLLECTION_TAG_SELECT,
            items: {
                select: {
                    source: true,
                },
            },
        },
        where: {
            userId,
        },
    });

    if (hasAccess) {
        const [items, collections] = await Promise.all([
            prisma.libraryItem.findMany({
                include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
                orderBy: [{ scrapedAt: "desc" }, { updatedAt: "desc" }],
                where: itemWhere,
            }) as Promise<LibraryItemWithCollections[]>,
            collectionsPromise,
        ]);

        return {
            collections: collections.map(
                (collection): LibraryCollectionSummary =>
                    toLibraryCollectionSummary(collection)
            ),
            itemSources: items.map((item) => ({ source: item.source })),
            items,
            lockedItemCount: 0,
            totalItemCount: items.length,
        };
    }

    const [items, totalItemCount, itemSources, collections] = await Promise.all(
        [
            prisma.libraryItem.findMany({
                include: LIBRARY_ITEM_COLLECTIONS_INCLUDE,
                orderBy: [{ scrapedAt: "desc" }, { updatedAt: "desc" }],
                take: FREE_LIBRARY_PREVIEW_ITEMS,
                where: itemWhere,
            }) as Promise<LibraryItemWithCollections[]>,
            prisma.libraryItem.count({
                where: itemWhere,
            }),
            prisma.libraryItem.findMany({
                distinct: ["source"],
                select: {
                    source: true,
                },
                where: itemWhere,
            }),
            collectionsPromise,
        ]
    );

    return {
        collections: collections.map(
            (collection): LibraryCollectionSummary =>
                toLibraryCollectionSummary(collection)
        ),
        itemSources,
        items,
        lockedItemCount: Math.max(totalItemCount - items.length, 0),
        totalItemCount,
    };
}

export default async function LibraryPage() {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const [hasAccess, linkedAccounts, userPreferences] = await Promise.all([
        userHasActiveSubscription(userId),
        prisma.account.findMany({
            select: { providerId: true },
            where: {
                providerId: {
                    in: listIntegrationAccountProviderIds(),
                },
                userId,
            },
        }),
        prisma.user.findUnique({
            select: { smartCollectionsDisabled: true },
            where: { id: userId },
        }),
    ]);

    const { collections, itemSources, items, lockedItemCount, totalItemCount } =
        await getUserLibraryPageData({
            hasAccess,
            userId,
        });

    const connectedIntegrationIds = listConnectedIntegrationIds("source", {
        libraryItemSources: itemSources.map((item) => item.source),
        linkedProviderIds: linkedAccounts.map((account) => account.providerId),
    });
    const connectedIntegrationIdSet = new Set(connectedIntegrationIds);

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <WorkspaceProvider
                    hasAccess={hasAccess}
                    initialCollections={collections}
                    initialItems={items}
                >
                    <Sidebar>
                        <SidebarHeader className="gap-3">
                            <UserMenu>
                                <UserMenuHeader />
                                <UserMenuContent />
                                <UserMenuFooter />
                            </UserMenu>
                            <SidebarGroup>
                                <Link
                                    className="contents"
                                    href="/library"
                                    prefetch
                                >
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
                                <Link className="contents" href="/review">
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
                            <IntegrationsList>
                                <IntegrationsListTrigger>
                                    <span className="min-w-0 text-xs">
                                        <T>Integrations</T>
                                    </span>
                                    <ChevronDownFilledIcon className="-ml-0.5" />
                                </IntegrationsListTrigger>
                                <IntegrationsListPanel>
                                    {INTEGRATIONS.map(
                                        ({ id, label, description, Icon }) => (
                                            <IntegrationsListItem
                                                className="group"
                                                key={id}
                                            >
                                                <Avatar
                                                    aria-label={label}
                                                    className="size-6 rounded-md"
                                                >
                                                    <AvatarFallback className="rounded-md">
                                                        <Icon
                                                            aria-hidden="true"
                                                            className="size-3.5 shrink-0"
                                                            focusable="false"
                                                        />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="min-w-0 flex-1 font-medium text-sm leading-snug">
                                                    {label}
                                                </span>
                                                <span className="relative flex items-center text-muted-foreground leading-snug">
                                                    <span className="absolute right-0 text-[11px] group-hover:opacity-0">
                                                        {description}
                                                    </span>
                                                    <IntegrationsListItemAction
                                                        className="absolute right-0 opacity-0 group-hover:opacity-100"
                                                        id={id}
                                                        isConnected={connectedIntegrationIdSet.has(
                                                            id
                                                        )}
                                                    />
                                                </span>
                                            </IntegrationsListItem>
                                        )
                                    )}
                                    <IntegrationsListNoticeCallout />
                                </IntegrationsListPanel>
                            </IntegrationsList>
                            <CollectionsListRoot
                                isSmartCollectionsDisabled={
                                    userPreferences?.smartCollectionsDisabled ??
                                    false
                                }
                            />
                        </SidebarHeader>
                    </Sidebar>
                    <div className="flex w-full max-w-[1024px] flex-col items-center gap-12 p-8 2xl:mx-auto">
                        <Root
                            lockedItemCount={lockedItemCount}
                            totalItemCount={totalItemCount}
                        />
                    </div>
                </WorkspaceProvider>
            </div>
        </PageShell>
    );
}
