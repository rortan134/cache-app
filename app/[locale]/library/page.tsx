import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { LibraryWorkspace } from "@/components/library/browser";
import {
    IntegrationsList,
    IntegrationsListEmpty,
    IntegrationsListItem,
    IntegrationsListItemAction,
    IntegrationsListNoticeCallout,
    IntegrationsListPanel,
    IntegrationsListTrigger,
} from "@/components/library/integrations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ChevronDownFilledIcon } from "@/components/ui/icons";
import { CtrlKbd, Kbd, KbdGroup } from "@/components/ui/kbd";
import { PageShell } from "@/components/ui/page-shell";
import { RadialChart } from "@/components/ui/radial-chart";
import { getServerSession } from "@/lib/auth/server";
import { userHasActiveSubscription } from "@/lib/auth/subscription-access";
import {
    LIBRARY_COLLECTION_TAG_SELECT,
    LIBRARY_ITEM_COLLECTIONS_INCLUDE,
    toLibraryCollectionSummary,
} from "@/lib/collections/utils";
import type {
    LibraryCollectionSummary,
    LibraryItemWithCollections,
} from "@/lib/common/types";
import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import {
    integrationSetupHeadingText,
    integrationSetupProgressPercent,
    partitionLibrarySyncLabels,
    syncableLibrarySourceTotal,
} from "@/lib/integrations/progress";
import {
    INTEGRATIONS,
    listConnectedIntegrationIds,
    listIntegrationAccountProviderIds,
} from "@/lib/integrations/support";
import { prisma } from "@/prisma";
import LogoIconImage from "@/public/cache-app-icon.png";
import { T } from "gt-next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
            "Saved items from your connected accounts and extension imports appear below by source."
        ),
        title: gtPublicString(locale, "library.metadata.title", "My library"),
    };
}

export default async function LibraryPage() {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const [hasAccess, linkedAccounts] = await Promise.all([
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

    const syncable = syncableLibrarySourceTotal();
    const { connectedLabels, missingLabels } = partitionLibrarySyncLabels(
        itemSources,
        connectedIntegrationIds
    );
    const connectedCount = connectedLabels.length;
    const progressPercent = integrationSetupProgressPercent(
        connectedCount,
        syncable
    );
    const setupText = integrationSetupHeadingText({
        connectedCount,
        connectedLabels,
        missingLabels,
        syncable,
    });

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <LibraryWorkspace
                    hasAccess={hasAccess}
                    initialCollections={collections}
                    initialItems={items}
                    lockedItemCount={lockedItemCount}
                    sidebarBottom={
                        <UserMenu>
                            <UserMenuHeader />
                            <UserMenuContent />
                            <UserMenuFooter />
                        </UserMenu>
                    }
                    sidebarHeader={
                        <>
                            <BrandLogo href="/library" src={LogoIconImage} />
                            <IntegrationsList className="group">
                                <IntegrationsListTrigger>
                                    <RadialChart
                                        className="pointer-events-none inline-block shrink-0 select-none"
                                        size={32}
                                        value={progressPercent}
                                    />
                                    <div className="relative">
                                        <span className="min-w-0 flex-1 truncate font-medium text-sm leading-none transition-opacity group-data-open:opacity-0 group-data-closed:duration-300 group-data-open:duration-400">
                                            <T>Integrations</T>
                                        </span>
                                        <span className="absolute top-1/2 left-0 min-w-0 flex-1 -translate-y-1/2 truncate font-medium text-sm leading-none opacity-0 transition-opacity group-data-open:opacity-100 group-data-closed:duration-300 group-data-open:duration-400">
                                            {setupText}
                                        </span>
                                    </div>
                                    <div className="ml-auto flex items-center justify-end gap-1">
                                        <KbdGroup className="opacity-0 group-hover:opacity-100 group-data-open:opacity-0!">
                                            <Kbd>
                                                <CtrlKbd />I
                                            </Kbd>
                                        </KbdGroup>
                                        <ChevronDownFilledIcon />
                                    </div>
                                </IntegrationsListTrigger>
                                <IntegrationsListPanel>
                                    {INTEGRATIONS.length > 0 ? (
                                        INTEGRATIONS.map(
                                            ({
                                                id,
                                                label,
                                                description,
                                                Icon,
                                            }) => (
                                                <IntegrationsListItem key={id}>
                                                    <Avatar
                                                        aria-label={label}
                                                        className="rounded-md"
                                                    >
                                                        <AvatarFallback className="rounded-md bg-muted/80">
                                                            <Icon
                                                                aria-hidden="true"
                                                                className="size-4.5 shrink-0 *:shadow"
                                                                focusable="false"
                                                            />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex min-w-0 flex-1 flex-col">
                                                        <span className="font-medium text-sm leading-snug">
                                                            {label}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                                            {description}
                                                        </span>
                                                    </div>
                                                    <IntegrationsListItemAction
                                                        id={id}
                                                        isConnected={connectedIntegrationIdSet.has(
                                                            id
                                                        )}
                                                    />
                                                </IntegrationsListItem>
                                            )
                                        )
                                    ) : (
                                        <IntegrationsListEmpty />
                                    )}
                                    <IntegrationsListNoticeCallout />
                                </IntegrationsListPanel>
                            </IntegrationsList>
                        </>
                    }
                    totalItemCount={totalItemCount}
                />
            </div>
        </PageShell>
    );
}
