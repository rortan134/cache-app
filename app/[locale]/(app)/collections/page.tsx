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
import { Suspense } from "react";

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
            <div className="flex w-full max-w-[1040px] flex-col gap-8 px-6 py-8 sm:px-8 2xl:mx-auto">
                <CollectionsPageHeader />
                <Suspense fallback={<CollectionsGridSkeleton />}>
                    <CollectionsPageBody />
                </Suspense>
            </div>
        </>
    );
}

function CollectionsPageHeader() {
    return (
        <header className="flex flex-col gap-2 border-border border-b pb-6">
            <h1 className="font-semibold text-foreground text-xl">
                <T>Collections</T>
            </h1>
            <p className="text-muted-foreground text-xs">
                <T>Every collection you have created in your workspace.</T>
            </p>
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
            <FadeIn className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed py-20 text-center">
                <p className="font-medium text-foreground text-sm">
                    <T>No collections yet</T>
                </p>
                <p className="text-muted-foreground text-xs">
                    <T>Collections you create will show up here.</T>
                </p>
            </FadeIn>
        );
    }

    return (
        <FadeIn>
            <CollectionsGrid collections={collections} />
        </FadeIn>
    );
}

function CollectionsGridSkeleton() {
    return (
        <div
            aria-busy="true"
            aria-label="Loading collections"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            role="status"
        >
            {COLLECTION_SKELETON_KEYS.map((key) => (
                <div
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-background"
                    key={key}
                >
                    <Skeleton className="h-40 w-full rounded-none" />
                    <div className="flex flex-col gap-2 p-3">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

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
