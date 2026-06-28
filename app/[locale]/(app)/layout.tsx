import { BackToTopButton } from "@/components/ui/back-to-top-button";
import { PageShell } from "@/components/ui/page-shell";
import { SidebarProvider } from "@/components/ui/sidebar";
import { T } from "gt-next";
import { ChevronUp } from "lucide-react";
import type * as React from "react";

export default function ApplicationLayout({
    children,
}: React.PropsWithChildren) {
    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <SidebarProvider>{children}</SidebarProvider>
                <BackToTopButton>
                    <ChevronUp
                        aria-hidden
                        className="size-4"
                        focusable="false"
                    />
                    <T>Back to top</T>
                </BackToTopButton>
            </div>
        </PageShell>
    );
}
