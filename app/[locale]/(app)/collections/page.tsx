import { buildPageMetadata } from "@/app/metadata";
import { CollectionsGrid } from "@/components/library/collections";
import { ApplicationSidebar } from "@/components/sidebar/application-sidebar";
import { FadeIn } from "@/components/ui/fade-in";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerSession } from "@/lib/auth/session";
import { listCollectionsWithPreviews } from "@/lib/collections/service";
import { T } from "gt-next";
import { getGT } from "gt-next/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import * as React from "react";

const COLLECTION_SKELETON_KEYS = [
    "c0",
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
    "c6",
    "c7",
] as const;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const gt = await getGT();

    return buildPageMetadata({
        description: gt(
            "Browse every collection in your workspace and jump back into what you saved."
        ),
        locale,
        path: "/collections",
        title: gt("Collections"),
    });
}

export default function CollectionsPage() {
    return (
        <>
            <ApplicationSidebar />
            <div className="relative z-0 flex w-full min-w-0 flex-1 flex-col gap-6 p-8">
                <React.Suspense fallback={<CollectionsPageSkeleton />}>
                    <CollectionsPageBody />
                </React.Suspense>
            </div>
        </>
    );
}

function CollectionsPageHeader() {
    return (
        <header className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
                <h1 className="font-semibold text-2xl text-foreground tracking-tight">
                    <T>Collections</T>
                </h1>
                <p className="text-muted-foreground text-sm">
                    <T>Every collection you have created in your workspace.</T>
                </p>
            </div>
        </header>
    );
}

async function CollectionsPageBody() {
    await connection();

    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const collections = await listCollectionsWithPreviews({ userId });

    if (collections.length === 0) {
        return (
            <FadeIn className="flex flex-col gap-8">
                <CollectionsPageHeader />
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed py-20 text-center">
                    <p className="font-medium text-foreground text-sm">
                        <T>No collections yet</T>
                    </p>
                    <p className="text-muted-foreground text-xs">
                        <T>Collections you create will show up here.</T>
                    </p>
                </div>
            </FadeIn>
        );
    }

    return (
        <FadeIn className="flex flex-col gap-8">
            <CollectionsPageHeader />
            <CollectionsGrid collections={collections} />
        </FadeIn>
    );
}

function CollectionsPageSkeleton() {
    return (
        <>
            <CollectionsPageHeader />
            <div
                aria-busy="true"
                aria-label="Loading collections"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                role="status"
            >
                {COLLECTION_SKELETON_KEYS.map((key) => (
                    <div
                        className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4"
                        key={key}
                    >
                        <Skeleton className="h-40 w-full rounded-xl" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                ))}
            </div>
        </>
    );
}
