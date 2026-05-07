import { buildPageMetadata } from "@/app/metadata";
import {
    UserMenu,
    UserMenuContent,
    UserMenuFooter,
    UserMenuHeader,
} from "@/components/auth/user-menu";
import { AppSidebarNavigation } from "@/components/ui/app-sidebar-navigation";
import { PageShell } from "@/components/ui/page-shell";
import { Sidebar, SidebarHeader } from "@/components/ui/sidebar";
import { WorkflowsList } from "@/components/workflows/workflows-list";
import { getServerSession } from "@/lib/auth/session";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import type { Metadata } from "next";
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
            "workflows.metadata.description",
            "Manage lightweight automations that organize and summarize your saved content."
        ),
        keywords: ["workflows", "automation", "smart collections", "digest"],
        locale,
        path: "/workflows",
        title: gtPublicString(locale, "workflows.metadata.title", "Workflows"),
    });
}

export default async function WorkflowsPage() {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return redirect("/");
    }

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
                        <AppSidebarNavigation />
                    </SidebarHeader>
                </Sidebar>
                <div className="flex w-full max-w-[1040px] flex-col gap-8 px-6 py-8 sm:px-8 2xl:mx-auto">
                    <header className="flex flex-col gap-2 border-border border-b pb-6">
                        <h1 className="font-semibold text-2xl text-foreground">
                            Workflows
                        </h1>
                    </header>
                    <WorkflowsList />
                </div>
            </div>
        </PageShell>
    );
}
