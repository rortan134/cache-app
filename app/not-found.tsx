"use client";

import { BrandLogo } from "@/components/ui/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { APP_NAME } from "@/lib/common/constants";
import LogoIconImage from "@/public/cache-app-icon.png";
import Link from "next/link";

export default function NotFoundPage() {
    return (
        <PageShell>
            <div className="mx-auto flex h-svh max-w-md flex-col items-center justify-center gap-5 text-center">
                <BrandLogo className="scale-80" src={LogoIconImage} />
                <h1 className="font-medium text-foreground text-lg">
                    Page not found
                </h1>
                <p className="text-base text-muted-foreground">
                    This page does not exist or has been moved.
                </p>
                <Link
                    className={buttonVariants({ variant: "default" })}
                    href="/"
                >
                    Back to {APP_NAME}
                </Link>
            </div>
        </PageShell>
    );
}
