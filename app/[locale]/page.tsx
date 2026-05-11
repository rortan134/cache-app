import { JsonLdScript } from "@/app/json-ld-script";
import { buildPageMetadata } from "@/app/metadata";
import { GoogleOneTapTrigger, SessionHint } from "@/components/auth/session";
import { SignInButton } from "@/components/auth/sign-in-buttons";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Carousel } from "@/components/ui/carousel";
import { Footer } from "@/components/ui/footer";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { ChromeIcon, TikTokIcon } from "@/components/ui/icons";
import { IridescenceBackground } from "@/components/ui/iridescence-background";
import { PageShell } from "@/components/ui/page-shell";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/session";
import { cn } from "@/lib/common/cn";
import { BASE_URL } from "@/lib/common/constants";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { INTEGRATIONS } from "@/lib/integrations/support";
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
    Bot,
    CircleCheck,
    CloudDownload,
    Component,
    Search,
    Sparkles,
    Terminal,
    Unlink,
    Workflow,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type React from "react";

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
            "The bookmark manager for busy people. View, manage, and organize bookmarks across platforms."
        ),
        keywords: [
            "bookmark manager",
            "unify bookmarks",
            "save content",
            "notion",
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
                    price: "8",
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
                                    Meet Cache — The bookmark manager for busy
                                    people. Collect, organize, and rediscover
                                    everything you've saved across platforms.
                                </p>
                            </T>
                        </div>
                        <SignInButton hasServerSession={!!session} />
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
                <div className="flex w-full max-w-[1024px] flex-col gap-12 p-8 2xl:mx-auto">
                    <div className="relative aspect-video h-auto w-full overflow-hidden rounded-2xl border border-border/70 bg-muted">
                        <IridescenceBackground />
                        <Image
                            alt=""
                            className="absolute top-12 left-8 z-10 w-full rounded-xl"
                            fetchPriority="high"
                            loading="eager"
                            priority
                            src={HeroImage}
                        />
                    </div>
                    <div className="-mt-1 mb-3 flex flex-col gap-1">
                        <h2 className="mx-auto text-center font-medium text-base">
                            <T>Bookmark Intelligence™</T>
                        </h2>
                        <p className="mx-auto text-center text-xs">
                            <T>
                                A tool managing all of your{" "}
                                <span className="underline decoration-muted-foreground decoration-dotted underline-offset-2">
                                    personal knowledge
                                </span>{" "}
                                at scale. Starting from $8/mo.
                            </T>
                        </p>
                    </div>
                    <section className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-3 py-5 md:gap-4">
                            <T context="Library">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Curate a library of all the content you love
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Get inspired, find that one lesson, piece of
                                    advice, recipe, or idea you've been looking
                                    for in the span of a coffee break. Cache is
                                    your command center for information.
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
                    </section>
                    <section className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-3 py-5 md:gap-4">
                            <T context="Integrations">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Import everything you've ever saved,{" "}
                                    <span className="opacity-50">
                                        from everywhere.
                                    </span>
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Bring together bookmarks from social, video,
                                    and browser automatically. Ditch the endless
                                    scrolling and tabbing through multiple
                                    platforms to find what matters to you.
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
                    </section>
                    <section className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-3 py-5 md:gap-4">
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
                            <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                <T context="Features">
                                    <li className="flex items-center gap-2">
                                        <Workflow className="inline-block size-4 shrink-0" />
                                        <span>
                                            Set up routine Workflows with custom
                                            instructions. Get a daily digest of
                                            your recent bookmarks.
                                        </span>
                                    </li>
                                </T>
                            </ul>
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
                    </section>
                    <section className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-3 py-5 md:gap-4">
                            <T context="Feed">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Search and explore from a single, fast feed
                                </h2>
                                <p className="text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    Streamline the way you consume and re-engage
                                    with your saved content from a modern and
                                    powerful interface, right in your browser.
                                </p>
                            </T>
                            <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                <T context="Features">
                                    <li className="flex items-center gap-2">
                                        <Terminal className="inline-block size-4 shrink-0" />
                                        <span>
                                            Use command menu and shortcuts for
                                            efficient workflows.
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs">
                                        <Search className="inline-block size-4 shrink-0" />
                                        <span>
                                            Find anything with full-text search
                                            and OCR
                                        </span>
                                    </li>
                                </T>
                            </ul>
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
                    </section>
                    <section className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-3 py-5 md:gap-4">
                            <T>
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Stay organized. Spot the stale, keep the
                                    useful
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
                                    <li className="flex items-center gap-2 text-xs">
                                        <Bot className="inline-block size-4 shrink-0" />
                                        <span>
                                            Give your agents the ability to
                                            interact with your bookmarks (MCP)
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
                    </section>
                    <section className="flex w-full flex-col gap-8">
                        <div className="flex flex-col gap-3">
                            <T context="Target audience">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    <T>Cache is for…</T>
                                </h2>
                                <p className="max-w-lg text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] tracking-[-3%] opacity-50">
                                    <T>
                                        Cache is built for people who save a
                                        lot, think a lot, and don’t want their
                                        best finds to disappear into “later.”
                                    </T>
                                </p>
                            </T>
                        </div>
                        <Carousel
                            className="w-full pb-10!"
                            slideClassName="!w-[300px] md:!w-[340px]"
                            spaceBetween={16}
                        >
                            <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                <h3 className="font-medium text-[#0A0B0D] text-lg tracking-[-0.5px]">
                                    <T>Curious readers</T>
                                </h3>
                                <p className="text-pretty font-medium text-[#0A0B0D] text-[15px] leading-[1.4] opacity-50">
                                    <T>
                                        Articles, essays, newsletters. A living
                                        library instead of a read‑later
                                        graveyard.
                                    </T>
                                </p>
                            </div>
                            <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                <h3 className="font-medium text-[#0A0B0D] text-lg tracking-[-0.5px]">
                                    <T>Writers and thinkers</T>
                                </h3>
                                <p className="text-pretty font-medium text-[#0A0B0D] text-[15px] leading-[1.4] opacity-50">
                                    <T>
                                        References, quotes, snippets. A
                                        searchable research stack for raw
                                        material.
                                    </T>
                                </p>
                            </div>
                            <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                <h3 className="font-medium text-[#0A0B0D] text-lg tracking-[-0.5px]">
                                    <T>Builders and developers</T>
                                </h3>
                                <p className="text-pretty font-medium text-[#0A0B0D] text-[15px] leading-[1.4] opacity-50">
                                    <T>
                                        Docs, issues, code, tutorials. Find that
                                        one link instantly without re‑searching.
                                    </T>
                                </p>
                            </div>
                            <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                <h3 className="font-medium text-[#0A0B0D] text-lg tracking-[-0.5px]">
                                    <T>Creators and curators</T>
                                </h3>
                                <p className="text-pretty font-medium text-[#0A0B0D] text-[15px] leading-[1.4] opacity-50">
                                    <T>
                                        Threads, videos, inspiration. Group
                                        ideas into collections and publish.
                                    </T>
                                </p>
                            </div>
                            <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                <h3 className="font-medium text-[#0A0B0D] text-lg tracking-[-0.5px]">
                                    <T>Productivity</T>
                                </h3>
                                <p className="text-pretty font-medium text-[#0A0B0D] text-[15px] leading-[1.4] opacity-50">
                                    <T>
                                        An opinionated inbox between bookmarking
                                        and note‑taking. Structured, searchable,
                                        trusted.
                                    </T>
                                </p>
                            </div>
                        </Carousel>
                    </section>
                    <section className="flex flex-col items-center gap-8">
                        <div className="mx-auto max-w-xl">
                            <div
                                aria-hidden="true"
                                className="grid aspect-ratio grid-cols-8 gap-px *:flex *:aspect-square *:rounded-xl *:ring-1 *:ring-border sm:grid-cols-10"
                            >
                                <div
                                    aria-hidden="true"
                                    className="max-sm:hidden"
                                />
                                <div aria-hidden="true" />
                                <div aria-hidden="true" />
                                <div className="relative bg-illustration shadow-black/10 shadow-md">
                                    <svg
                                        aria-hidden="true"
                                        className="m-auto size-6"
                                        fill="none"
                                        viewBox="0 0 100 100"
                                    >
                                        <path
                                            d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z"
                                            fill="#5E6AD2"
                                        />
                                    </svg>
                                </div>
                                <div aria-hidden="true" />
                                <div />
                                <div />
                                <div className="relative bg-illustration shadow-black/10 shadow-md">
                                    <svg
                                        aria-hidden="true"
                                        className="m-auto size-6"
                                        height="1em"
                                        preserveAspectRatio="xMidYMid"
                                        viewBox="0 0 256 222"
                                        width="1em"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="m128 0 128 221.705H0z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </div>
                                <div />
                                <div
                                    aria-hidden="true"
                                    className="max-sm:hidden"
                                />
                                <div
                                    aria-hidden="true"
                                    className="max-sm:hidden"
                                />
                                <div />
                                <div className="relative bg-illustration shadow-black/10 shadow-md">
                                    <svg
                                        aria-hidden="true"
                                        className="m-auto size-6"
                                        preserveAspectRatio="xMidYMid"
                                        viewBox="0 0 256 257"
                                    >
                                        <path
                                            d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z"
                                            fill="#D97757"
                                        />
                                    </svg>
                                </div>
                                <div aria-hidden="true" />
                                <div aria-hidden="true" />
                                <div aria-hidden="true" />
                                <div className="relative bg-illustration shadow-black/10 shadow-md">
                                    <svg
                                        aria-hidden="true"
                                        className="m-auto size-6"
                                        fill="none"
                                        viewBox="0 0 296 298"
                                    >
                                        <mask
                                            height="298"
                                            id="gemini__a"
                                            maskUnits="userSpaceOnUse"
                                            style={{ maskType: "alpha" }}
                                            width="296"
                                            x="0"
                                            y="0"
                                        >
                                            <path
                                                d="M141.201 4.886c2.282-6.17 11.042-6.071 13.184.148l5.985 17.37a184.004 184.004 0 0 0 111.257 113.049l19.304 6.997c6.143 2.227 6.156 10.91.02 13.155l-19.35 7.082a184.001 184.001 0 0 0-109.495 109.385l-7.573 20.629c-2.241 6.105-10.869 6.121-13.133.025l-7.908-21.296a184 184 0 0 0-109.02-108.658l-19.698-7.239c-6.102-2.243-6.118-10.867-.025-13.132l20.083-7.467A183.998 183.998 0 0 0 133.291 26.28l7.91-21.394Z"
                                                fill="#3186FF"
                                            />
                                        </mask>
                                        <g mask="url(#gemini__a)">
                                            <g filter="url(#gemini__b)">
                                                <ellipse
                                                    cx="163"
                                                    cy="149"
                                                    fill="#3689FF"
                                                    rx="196"
                                                    ry="159"
                                                />
                                            </g>
                                            <g filter="url(#gemini__c)">
                                                <ellipse
                                                    cx="33.5"
                                                    cy="142.5"
                                                    fill="#F6C013"
                                                    rx="68.5"
                                                    ry="72.5"
                                                />
                                            </g>
                                            <g filter="url(#gemini__d)">
                                                <ellipse
                                                    cx="19.5"
                                                    cy="148.5"
                                                    fill="#F6C013"
                                                    rx="68.5"
                                                    ry="72.5"
                                                />
                                            </g>
                                            <g filter="url(#gemini__e)">
                                                <path
                                                    d="M194 10.5C172 82.5 65.5 134.333 22.5 135L144-66l50 76.5Z"
                                                    fill="#FA4340"
                                                />
                                            </g>
                                            <g filter="url(#gemini__f)">
                                                <path
                                                    d="M190.5-12.5C168.5 59.5 62 111.333 19 112L140.5-89l50 76.5Z"
                                                    fill="#FA4340"
                                                />
                                            </g>
                                            <g filter="url(#gemini__g)">
                                                <path
                                                    d="M194.5 279.5C172.5 207.5 66 155.667 23 155l121.5 201 50-76.5Z"
                                                    fill="#14BB69"
                                                />
                                            </g>
                                            <g filter="url(#gemini__h)">
                                                <path
                                                    d="M196.5 320.5C174.5 248.5 68 196.667 25 196l121.5 201 50-76.5Z"
                                                    fill="#14BB69"
                                                />
                                            </g>
                                        </g>
                                        <defs>
                                            <filter
                                                colorInterpolationFilters="sRGB"
                                                filterUnits="userSpaceOnUse"
                                                height="390"
                                                id="gemini__b"
                                                width="464"
                                                x="-69"
                                                y="-46"
                                            >
                                                <feFlood
                                                    floodOpacity="0"
                                                    result="BackgroundImageFix"
                                                />
                                                <feBlend
                                                    in="SourceGraphic"
                                                    in2="BackgroundImageFix"
                                                    result="shape"
                                                />
                                                <feGaussianBlur
                                                    result="effect1_foregroundBlur_69_17998"
                                                    stdDeviation="18"
                                                />
                                            </filter>
                                            <filter
                                                colorInterpolationFilters="sRGB"
                                                filterUnits="userSpaceOnUse"
                                                height="273"
                                                id="gemini__c"
                                                width="265"
                                                x="-99"
                                                y="6"
                                            >
                                                <feFlood
                                                    floodOpacity="0"
                                                    result="BackgroundImageFix"
                                                />
                                                <feBlend
                                                    in="SourceGraphic"
                                                    in2="BackgroundImageFix"
                                                    result="shape"
                                                />
                                                <feGaussianBlur
                                                    result="effect1_foregroundBlur_69_17998"
                                                    stdDeviation="32"
                                                />
                                            </filter>
                                            <filter
                                                colorInterpolationFilters="sRGB"
                                                filterUnits="userSpaceOnUse"
                                                height="273"
                                                id="gemini__d"
                                                width="265"
                                                x="-113"
                                                y="12"
                                            >
                                                <feFlood
                                                    floodOpacity="0"
                                                    result="BackgroundImageFix"
                                                />
                                                <feBlend
                                                    in="SourceGraphic"
                                                    in2="BackgroundImageFix"
                                                    result="shape"
                                                />
                                                <feGaussianBlur
                                                    result="effect1_foregroundBlur_69_17998"
                                                    stdDeviation="32"
                                                />
                                            </filter>
                                            <filter
                                                colorInterpolationFilters="sRGB"
                                                filterUnits="userSpaceOnUse"
                                                height="329"
                                                id="gemini__e"
                                                width="299.5"
                                                x="-41.5"
                                                y="-130"
                                            >
                                                <feFlood
                                                    floodOpacity="0"
                                                    result="BackgroundImageFix"
                                                />
                                                <feBlend
                                                    in="SourceGraphic"
                                                    in2="BackgroundImageFix"
                                                    result="shape"
                                                />
                                                <feGaussianBlur
                                                    result="effect1_foregroundBlur_69_17998"
                                                    stdDeviation="32"
                                                />
                                            </filter>
                                            <filter
                                                colorInterpolationFilters="sRGB"
                                                filterUnits="userSpaceOnUse"
                                                height="329"
                                                id="gemini__f"
                                                width="299.5"
                                                x="-45"
                                                y="-153"
                                            >
                                                <feFlood
                                                    floodOpacity="0"
                                                    result="BackgroundImageFix"
                                                />
                                                <feBlend
                                                    in="SourceGraphic"
                                                    in2="BackgroundImageFix"
                                                    result="shape"
                                                />
                                                <feGaussianBlur
                                                    result="effect1_foregroundBlur_69_17998"
                                                    stdDeviation="32"
                                                />
                                            </filter>
                                            <filter
                                                colorInterpolationFilters="sRGB"
                                                filterUnits="userSpaceOnUse"
                                                height="329"
                                                id="gemini__g"
                                                width="299.5"
                                                x="-41"
                                                y="91"
                                            >
                                                <feFlood
                                                    floodOpacity="0"
                                                    result="BackgroundImageFix"
                                                />
                                                <feBlend
                                                    in="SourceGraphic"
                                                    in2="BackgroundImageFix"
                                                    result="shape"
                                                />
                                                <feGaussianBlur
                                                    result="effect1_foregroundBlur_69_17998"
                                                    stdDeviation="32"
                                                />
                                            </filter>
                                            <filter
                                                colorInterpolationFilters="sRGB"
                                                filterUnits="userSpaceOnUse"
                                                height="329"
                                                id="gemini__h"
                                                width="299.5"
                                                x="-39"
                                                y="132"
                                            >
                                                <feFlood
                                                    floodOpacity="0"
                                                    result="BackgroundImageFix"
                                                />
                                                <feBlend
                                                    in="SourceGraphic"
                                                    in2="BackgroundImageFix"
                                                    result="shape"
                                                />
                                                <feGaussianBlur
                                                    result="effect1_foregroundBlur_69_17998"
                                                    stdDeviation="32"
                                                />
                                            </filter>
                                        </defs>
                                    </svg>
                                </div>
                                <div aria-hidden="true" />
                                <div aria-hidden="true" />
                                <div
                                    aria-hidden="true"
                                    className="max-sm:hidden"
                                />
                                <div
                                    aria-hidden="true"
                                    className="max-sm:hidden"
                                />
                                <div aria-hidden="true" />
                                <div aria-hidden="true" />
                                <div className="relative bg-illustration shadow-black/10 shadow-md">
                                    <svg
                                        aria-hidden="true"
                                        className="m-auto size-6"
                                        height="1em"
                                        preserveAspectRatio="xMidYMid"
                                        viewBox="0 0 256 229"
                                        width="1em"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M128 228.542c9.895 0 17.91-8.015 17.91-17.91V55.413h-35.82v155.219c0 9.895 8.015 17.91 17.91 17.91Z"
                                            fill="#F9AB00"
                                        />
                                        <path
                                            d="M199.356 112.053C180.043 92.755 151.193 88.845 128 100.307l76.669 76.67c3.164 3.163 8.612 1.91 9.955-2.344 6.746-21.357 1.657-45.64-15.268-62.58Z"
                                            fill="#5BB974"
                                        />
                                        <path
                                            d="M56.644 112.053C75.957 92.755 104.807 88.845 128 100.307l-76.669 76.67c-3.164 3.163-8.612 1.91-9.955-2.344-6.746-21.357-1.657-45.64 15.268-62.58Z"
                                            fill="#129EAF"
                                        />
                                        <path
                                            d="M193.67 52.548c-30.507 0-56.402 20-65.67 47.76h121.25c4.97 0 8.283-5.254 6.03-9.687-11.523-22.611-34.776-38.073-61.61-38.073Z"
                                            fill="#AF5CF7"
                                        />
                                        <path
                                            d="M140.671 20.101C119.09 41.682 114.926 74.114 128 100.307l85.743-85.743c3.523-3.522 2.15-9.582-2.582-11.119-24.148-7.836-51.52-2.313-70.49 16.656Z"
                                            fill="#FF8BCB"
                                        />
                                        <path
                                            d="M115.329 20.101C136.91 41.682 141.074 74.114 128 100.307L42.257 14.564c-3.523-3.522-2.15-9.582 2.582-11.119 24.148-7.836 51.52-2.313 70.49 16.656Z"
                                            fill="#FA7B17"
                                        />
                                        <path
                                            d="M62.33 52.548c30.507 0 56.402 20 65.67 47.76H6.75c-4.97 0-8.283-5.254-6.03-9.687C12.244 68.01 35.497 52.548 62.33 52.548Z"
                                            fill="#4285F4"
                                        />
                                    </svg>
                                </div>
                                <div aria-hidden="true" />
                                <div className="relative bg-illustration shadow-black/10 shadow-md">
                                    <svg
                                        aria-hidden="true"
                                        className="m-auto size-6"
                                        height="1em"
                                        preserveAspectRatio="xMidYMid"
                                        viewBox="0 0 256 260"
                                        width="1em"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </div>
                                <div aria-hidden="true" />
                                <div aria-hidden="true" />
                                <div aria-hidden="true" />
                                <div
                                    aria-hidden="true"
                                    className="max-sm:hidden"
                                />
                            </div>
                        </div>
                        <T>
                            <h3>
                                <span className="opacity-50">
                                    You don't have to use Cache.
                                </span>{" "}
                                Let your agent
                                <Bot className="size-5" /> use it
                            </h3>
                            <q>What are the best bookmarks I've saved today</q>
                        </T>
                    </section>
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
