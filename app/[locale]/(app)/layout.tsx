import { BackToTopButton } from "@/components/ui/back-to-top-button";
import { PageShell } from "@/components/ui/page-shell";
import { SIDEBAR_COOKIE_NAME, SidebarProvider } from "@/components/ui/sidebar";
import { T } from "gt-next";
import { ChevronUp } from "lucide-react";
import { cookies } from "next/headers";
import type * as React from "react";

export default async function ApplicationLayout({
    children,
}: React.PropsWithChildren) {
    const cookieStore = await cookies();
    const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value;
    const defaultOpen = sidebarCookie !== "false";

    return (
        <PageShell className="flex-1 gap-8 lg:flex-row lg:justify-between">
            <SidebarProvider defaultOpen={defaultOpen}>
                {children}
            </SidebarProvider>
            <BackToTopButton>
                <ChevronUp aria-hidden className="size-4.5" focusable="false" />
                <T>Back to top</T>
            </BackToTopButton>
        </PageShell>
    );
}
