import { buildPageMetadata } from "@/app/metadata";
import { APP_NAME } from "@/lib/common/constants";
import { T, Var } from "gt-next";
import { getGT } from "gt-next/server";
import { ArrowRight, Scale, Shield, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const gt = await getGT();

    return buildPageMetadata({
        description: gt(
            "Legal documents, policies, and disclosures for {appName}.",
            { appName: APP_NAME }
        ),
        keywords: ["legal", "policies", APP_NAME],
        locale,
        path: "/legal",
        title: gt("Legal"),
    });
}

interface LegalDoc {
    description: ReactNode;
    href: string;
    icon: typeof Scale;
    title: ReactNode;
}

export default async function LegalIndexPage({
    params,
}: Readonly<{
    params: Promise<{ locale: string }>;
}>) {
    const { locale } = await params;
    const base = `/${locale}/legal`;

    const documents: LegalDoc[] = [
        {
            description: (
                <T>
                    Rules governing use of the service, management of your
                    account, and acceptable use.
                </T>
            ),
            href: `${base}/terms-of-service`,
            icon: Scale,
            title: <T>Terms of Service</T>,
        },
        {
            description: (
                <T>How we collect, use, and protect personal information.</T>
            ),
            href: `${base}/privacy-policy`,
            icon: Shield,
            title: <T>Privacy Policy</T>,
        },
        {
            description: (
                <T>How we process and safeguard customer personal data.</T>
            ),
            href: `${base}/dpa`,
            icon: FileText,
            title: <T>Data Processing Agreement</T>,
        },
    ];

    return (
        <div className="relative flex flex-col gap-10">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[min(100vw,42rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,--theme(--color-muted/55%)_0%,transparent_68%)] blur-2xl"
            />

            <header className="relative flex flex-col gap-3 text-pretty">
                <p className="font-medium text-[0.7rem] text-muted-foreground uppercase tracking-[0.22em]">
                    <T context="Legal section eyebrow label">
                        <Var>{APP_NAME}</Var>
                    </T>
                </p>
                <h1 className="font-semibold text-3xl text-foreground tracking-tight sm:text-[2rem] sm:leading-tight">
                    <T>Legal and policies</T>
                </h1>
                <p className="max-w-2xl text-[0.95rem] text-muted-foreground leading-relaxed">
                    <T>
                        Official documents that govern your relationship with us
                        and explain how we handle data. Choose a topic below to
                        read the full text.
                    </T>
                </p>
            </header>

            <ul className="relative m-0 flex list-none flex-col gap-3 p-0">
                {documents.map(({ description, href, icon: Icon, title }) => (
                    <li key={href}>
                        <Link
                            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-5 shadow-[0_1px_0_0_rgb(255_255_255/0.6)_inset] backdrop-blur-[2px] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:items-center sm:gap-5 sm:p-6 dark:shadow-[0_1px_0_0_rgb(255_255_255/0.06)_inset]"
                            href={href}
                        >
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground shadow-inner transition-colors duration-200 group-hover:bg-foreground group-hover:text-background">
                                <Icon aria-hidden className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground text-lg tracking-tight">
                                        {title}
                                    </span>
                                </div>
                                <p className="mt-1 text-[0.9rem] text-muted-foreground leading-relaxed">
                                    {description}
                                </p>
                            </div>
                            <ArrowRight
                                aria-hidden
                                className="size-5 shrink-0 text-muted-foreground transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-foreground/90 sm:mt-0"
                            />
                        </Link>
                    </li>
                ))}
            </ul>
            <p className="relative border-muted border-t pt-6 text-[0.85rem] text-muted-foreground leading-relaxed">
                <T>
                    These pages may be updated periodically. The version on this
                    site is the version in effect at the time of your visit.
                </T>
            </p>
        </div>
    );
}
