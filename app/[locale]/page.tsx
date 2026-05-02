import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { GoogleOneTapTrigger, SessionHint } from "@/components/auth/session";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/ui/footer";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { ChromeIcon, TikTokIcon } from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/server";
import { BASE_URL } from "@/lib/common/constants";
import { cn } from "@/lib/common/cn";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { INTEGRATIONS } from "@/lib/integrations/support";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import LogoIconImage from "@/public/cache-app-icon.png";
import IconSmallImage from "@/public/cache-icon-small.png";
import CollectionsSectionImage from "@/public/collections-section-image.webp";
import QRCodeDownloadImage from "@/public/download-qrcode.png";
import HeroImage from "@/public/hero-image.webp";
import LibrarySectionImage from "@/public/library-section.webp";
import OrganizeSectionImage from "@/public/organize-section.webp";
import SmartCollectionsBackgroundImage from "@/public/smart-collections-background.webp";
import { LocaleSelector, T } from "gt-next";
import {
    ChevronRight,
    CircleCheck,
    CloudDownload,
    Component,
    Search,
    Sparkles,
    Unlink,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return buildPageMetadata({
        description: gtPublicString(
            locale,
            "home.metadata.description",
            "View, manage, and organize bookmarks across browsers and platforms — built for power users who save at scale."
        ),
        keywords: [
            "bookmark manager",
            "unify bookmarks",
            "save content",
            "personal knowledge library",
            "Cache App",
        ],
        locale,
        path: "/",
        title: gtPublicString(
            locale,
            "home.metadata.title",
            "Unify your bookmarks across every platform"
        ),
    });
}

export default async function Home() {
    const session = await getServerSession();

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                name: "Cache App",
                url: BASE_URL,
            },
            {
                "@type": "Organization",
                logo: `${BASE_URL}/icon1.png`,
                name: "CachdApp, Inc",
                url: BASE_URL,
            },
            {
                "@type": "SoftwareApplication",
                applicationCategory: "ProductivityApplication",
                name: "Cache App",
                offers: {
                    "@type": "Offer",
                    price: "5",
                    priceCurrency: "EUR",
                },
                operatingSystem: "Any",
            },
        ],
    };

    return (
        <PageShell>
            <JsonLdScript data={jsonLd} />
            <GoogleOneTapTrigger />
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <Sidebar>
                    <SidebarHeader>
                        <BrandLogo href="/library" src={LogoIconImage} />
                        <div className="flex flex-col gap-3">
                            <T context="'Cache' is the product's name">
                                <h1 className="font-medium text-[3rem] leading-[98%] md:text-[4rem] md:tracking-[-0.21875rem]">
                                    <GradientWaveText ariaLabel="Unify your bookmarks">
                                        Unify your bookmarks.
                                    </GradientWaveText>
                                </h1>
                                <p className="font-medium text-[#0A0B0D] text-[1rem] leading-[1.22] tracking-[-3%] opacity-50 lg:max-w-[320px]">
                                    Meet Cache — A new kind of bookmark manager.
                                    Collect, organize, and rediscover everything
                                    you've saved across platforms.
                                </p>
                            </T>
                        </div>
                        {session ? (
                            <Button
                                render={
                                    <Link href="/library">
                                        Go to my library
                                        <ChevronRight className="size-4" />
                                    </Link>
                                }
                                size="xl"
                                suppressHydrationWarning
                            />
                        ) : (
                            <GoogleSignInButton>
                                <T context="Sign in/up CTA button">
                                    Continue with Google
                                </T>
                            </GoogleSignInButton>
                        )}
                        <SessionHint serverSession={session} />
                    </SidebarHeader>
                    <SidebarFooter>
                        <div className="hidden items-center gap-3 lg:flex">
                            <Image
                                alt="Download QR Code"
                                className="size-20"
                                height={80}
                                loading="eager"
                                priority
                                src={QRCodeDownloadImage}
                                width={80}
                            />
                            <div className="flex flex-col gap-1.5 pb-[2px]">
                                <p className="font-medium font-regular text-[#0A0B0D] text-[18px] tracking-[-3%]">
                                    <T context="Chrome web store browser extension">
                                        Install the extension
                                    </T>
                                </p>
                                <p className="flex shrink-0 flex-row items-center gap-1.5 truncate text-[#0A0B0D] text-[1rem] leading-[1.22] tracking-[-3%]">
                                    <span>
                                        <ChromeIcon className="size-4" />
                                    </span>
                                    <span className="opacity-50">
                                        Chrome Web Store
                                    </span>
                                </p>
                            </div>
                        </div>
                        <LocaleSelector />
                    </SidebarFooter>
                </Sidebar>
                <div className="flex w-full max-w-[1024px] flex-col items-center gap-12 p-8 2xl:mx-auto">
                    <div className="relative aspect-video h-auto w-full overflow-hidden rounded-2xl border border-border/50 bg-muted">
                        <Image
                            alt=""
                            className="absolute inset-x-6 top-10 rounded-xl"
                            fetchPriority="high"
                            loading="eager"
                            priority
                            src={HeroImage}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <p className="mx-auto text-center text-xs">
                            <T>Discover what Cache can do for you</T>
                        </p>
                        <p className="mx-auto text-center font-medium text-xs">
                            <T>
                                <span className="opacity-50">A tool for</span>{" "}
                                managing all your personal knowledge
                                <span className="opacity-50"> at scale</span>
                            </T>
                        </p>
                        <p className="mx-auto text-center text-xs">
                            <T>Starting from $5/month</T>
                        </p>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Library">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Curate a library of all the content you love
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Get inspired, find that one lesson, piece of
                                    advice, recipe, or idea you've been looking
                                    for in the span of a coffee break.
                                </p>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                <Image
                                    alt=""
                                    height={800}
                                    loading="eager"
                                    priority
                                    src={LibrarySectionImage}
                                    width={800}
                                />
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Integrations">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Connect your favorite platforms — Import
                                    everything you've ever saved
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Bring together bookmarks from social, video,
                                    and the browser automatically. Ditch the
                                    endless scrolling and tabbing through
                                    multiple platforms to find what matters to
                                    you.
                                </p>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="relative flex h-full items-center justify-center overflow-hidden p-6">
                                <div className="relative mx-auto flex w-full max-w-sm items-center justify-between">
                                    <div className="space-y-6">
                                        {INTEGRATIONS.slice(0, 3).map(
                                            ({ id, Icon }, index) => (
                                                <IntegrationCard
                                                    key={id}
                                                    position={
                                                        [
                                                            "left-top",
                                                            "left-middle",
                                                            "left-bottom",
                                                        ][
                                                            index
                                                        ] as IntegrationCardPosition
                                                    }
                                                >
                                                    <Icon className="size-6" />
                                                </IntegrationCard>
                                            )
                                        )}
                                    </div>
                                    <div className="relative z-20 rounded-2xl border bg-muted p-1">
                                        <IntegrationCard
                                            className="size-16 border-black/20 shadow-black/10 shadow-xl"
                                            isCenter
                                        >
                                            <Image
                                                alt="Cache"
                                                className="size-9"
                                                height={32}
                                                src={IconSmallImage}
                                                width={32}
                                            />
                                        </IntegrationCard>
                                    </div>
                                    <div
                                        aria-hidden
                                        className="mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] absolute inset-1/3 bg-[radial-gradient(var(--dots-color)_1px,transparent_1px)] bg-size-[16px_16px] opacity-50 [--dots-color:black]"
                                    />
                                    <div className="space-y-6">
                                        {INTEGRATIONS.slice(3, 6).map(
                                            ({ id, Icon }, index) => (
                                                <IntegrationCard
                                                    key={id}
                                                    position={
                                                        [
                                                            "right-top",
                                                            "right-middle",
                                                            "right-bottom",
                                                        ][
                                                            index
                                                        ] as IntegrationCardPosition
                                                    }
                                                >
                                                    <Icon className="size-6" />
                                                </IntegrationCard>
                                            )
                                        )}
                                    </div>
                                </div>
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Habits">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Stop leaving it for "later"
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Create more actionable opportunities for
                                    yourself by keeping your most insightful
                                    saved content top of mind instead of losing
                                    it in a backlog of forgotten bookmarks.
                                </p>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                <Image
                                    alt=""
                                    height={800}
                                    src={CollectionsSectionImage}
                                    width={800}
                                />
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Feed">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Search and explore from a single, fast feed
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Streamline the way you consume and re-engage
                                    with your saved content from a single,
                                    clean, and powerful interface, right in your
                                    browser.
                                </p>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                <Image
                                    alt=""
                                    height={800}
                                    src={OrganizeSectionImage}
                                    width={800}
                                />
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T>
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Stay organized. Spot the stale, keep the
                                    useful ones
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Build a knowledge base with the content
                                    you've already deemed important. Import once
                                    and go from messy to organized in minutes.
                                </p>
                            </T>
                            <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                <T context="Features">
                                    <li className="flex items-center gap-2">
                                        <Component className="inline-block size-4 shrink-0" />
                                        <span>
                                            <span className="font-medium">
                                                Smart Collections
                                            </span>{" "}
                                            helps you separate the actionable
                                            from the inspiration
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs">
                                        <Search className="inline-block size-4 shrink-0" />
                                        <span>
                                            Find anything with associative
                                            full-text search and OCR
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs">
                                        <CloudDownload className="inline-block size-4 shrink-0" />
                                        <span>
                                            Share or export collections from
                                            Cache anytime
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs">
                                        <Unlink className="inline-block size-4 shrink-0" />
                                        <span>
                                            Remove duplicates and broken links
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs">
                                        <Sparkles className="inline-block size-4 shrink-0" />
                                        <span>
                                            Gain AI-powered insights into your
                                            content
                                        </span>
                                    </li>
                                </T>
                            </ul>
                        </div>
                        <div className="relative order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="h-full overflow-hidden">
                                <Image
                                    alt=""
                                    className="absolute inset-0 size-full object-cover"
                                    src={SmartCollectionsBackgroundImage}
                                />
                                <div className="relative flex h-full items-center justify-center p-8 py-12">
                                    <div
                                        aria-hidden
                                        className="w-full max-w-96"
                                    >
                                        <div className="flex items-center gap-2 rounded-xl border bg-background p-3 shadow-sm">
                                            <CircleCheck className="size-4.5 fill-emerald-500/15 text-emerald-500" />
                                            <span className="font-medium text-foreground text-sm">
                                                All done — Content library
                                                organized
                                            </span>
                                        </div>
                                        <div className="relative space-y-4 pt-6 pl-6">
                                            <div className="absolute top-0 bottom-8 left-6 border-border border-l border-dashed mix-blend-color-dodge" />
                                            <div className="relative pl-6">
                                                <div className="absolute top-0 bottom-1/2 left-0 w-6 rounded-bl-full border-border border-b border-l border-dashed mix-blend-color-dodge" />
                                                <div className="flex items-center gap-2 rounded-xl border bg-background p-3 shadow-sm">
                                                    <ChromeIcon className="size-3.5" />
                                                    <span className="font-medium text-[11px] text-muted-foreground">
                                                        Bookmarks imported
                                                        <span className="pl-3 text-foreground/50">
                                                            1m ago
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative pl-6">
                                                <div className="absolute top-0 bottom-1/2 left-0 w-6 rounded-bl-full border-border border-b border-l border-dashed mix-blend-color-dodge" />
                                                <div className="flex items-center gap-2 rounded-xl border bg-background p-3 shadow-sm">
                                                    <TikTokIcon className="size-3.5" />
                                                    <span className="font-medium text-[11px] text-muted-foreground">
                                                        Bookmarks imported
                                                        <span className="pl-3 text-foreground/50">
                                                            1m ago
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative pl-6">
                                                <div className="absolute top-0 bottom-1/2 left-0 w-6 rounded-bl-full border-border border-b border-l border-dashed mix-blend-color-dodge" />
                                                <div className="flex items-center gap-2 rounded-xl border bg-background p-3 shadow-sm">
                                                    <Component className="size-3.5" />
                                                    <span className="font-medium text-[11px] text-muted-foreground">
                                                        Smart Collections sorted
                                                        40 entries
                                                        <span className="pl-3 text-foreground/50">
                                                            24s ago
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative pl-6">
                                                <div className="absolute top-0 bottom-1/2 left-0 w-6 rounded-bl-full border-border border-b border-l border-dashed mix-blend-color-dodge" />
                                                <div className="flex items-center gap-2 rounded-xl border bg-background p-3 shadow-sm">
                                                    <Search className="size-3.5" />
                                                    <span className="font-medium text-[11px] text-muted-foreground">
                                                        OCR search indexed
                                                        <span className="pl-3 text-foreground/50">
                                                            8s ago
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative pl-6">
                                                <div className="absolute top-0 bottom-1/2 left-0 w-6 rounded-bl-full border-border border-b border-l border-dashed mix-blend-color-dodge" />
                                                <div className="flex items-center gap-2 rounded-xl border bg-background p-3 shadow-sm">
                                                    <CloudDownload className="size-3.5" />
                                                    <span className="font-medium text-[11px] text-muted-foreground">
                                                        Export & Share ready
                                                        <span className="pl-3 text-foreground/50">
                                                            now
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </figure>
                        </div>
                    </div>
                    <Footer />
                </div>
            </div>
        </PageShell>
    );
}

type IntegrationCardPosition =
    | "left-top"
    | "left-middle"
    | "left-bottom"
    | "right-top"
    | "right-middle"
    | "right-bottom";

function IntegrationCard({
    children,
    className,
    position,
    isCenter = false,
}: {
    children: React.ReactNode;
    className?: string;
    position?: IntegrationCardPosition;
    isCenter?: boolean;
}) {
    return (
        <div
            className={cn(
                "relative flex size-12 rounded-xl border bg-background",
                className
            )}
        >
            <div
                className={cn(
                    "relative z-20 m-auto size-fit *:size-6",
                    isCenter && "*:size-8"
                )}
            >
                {children}
            </div>
            {position && !isCenter && (
                <div
                    className={cn(
                        "absolute z-10 h-px bg-linear-to-r to-muted-foreground/25",
                        position === "left-top" &&
                            "top-1/2 left-full w-[130px] origin-left rotate-25",
                        position === "left-middle" &&
                            "top-1/2 left-full w-[120px] origin-left",
                        position === "left-bottom" &&
                            "top-1/2 left-full w-[130px] origin-left rotate-[-25deg]",
                        position === "right-top" &&
                            "top-1/2 right-full w-[130px] origin-right rotate-[-25deg] bg-linear-to-l",
                        position === "right-middle" &&
                            "top-1/2 right-full w-[120px] origin-right bg-linear-to-l",
                        position === "right-bottom" &&
                            "top-1/2 right-full w-[130px] origin-right rotate-25 bg-linear-to-l"
                    )}
                />
            )}
        </div>
    );
}
