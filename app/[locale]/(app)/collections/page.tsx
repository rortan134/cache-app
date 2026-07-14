import { buildPageMetadata } from "@/app/metadata";
import { ApplicationSidebar } from "@/components/sidebar/application-sidebar";
import { CollectionsGrid } from "@/components/library/collections";
import { getServerSession } from "@/lib/auth/session";
import { listCollectionsWithPreviews } from "@/lib/collections/service";
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
            "collections.metadata.description",
            "Browse every collection in your workspace and jump back into what you saved."
        ),
        locale,
        path: "/collections",
        title: gtPublicString(
            locale,
            "collections.metadata.title",
            "Collections"
        ),
    });
}

export default async function CollectionsPage() {
    await connection();

    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

    const collections = await listCollectionsWithPreviews({ userId });

    return (
        <>
            <ApplicationSidebar />
            <div className="flex w-full max-w-[1040px] flex-col gap-8 px-6 py-8 sm:px-8 2xl:mx-auto">
                <header className="flex flex-col gap-2 border-border border-b pb-6">
                    <h1 className="font-semibold text-foreground text-xl">
                        <T>Collections</T>
                    </h1>
                    <p className="text-muted-foreground text-xs">
                        <T>
                            Every collection you have created in your workspace.
                        </T>
                    </p>
                </header>
                {collections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border border-dashed py-20 text-center">
                        <p className="font-medium text-foreground text-sm">
                            <T>No collections yet</T>
                        </p>
                        <p className="text-muted-foreground text-xs">
                            <T>Collections you create will show up here.</T>
                        </p>
                    </div>
                ) : (
                    <CollectionsGrid collections={collections} />
                )}
            </div>
        </>
    );
}
