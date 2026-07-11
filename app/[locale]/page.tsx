import { JsonLdScript } from "@/app/json-ld-script";
import { buildPageMetadata } from "@/app/metadata";
import { GoogleOneTapTrigger, SessionHint } from "@/components/auth/session";
import { SignInButton } from "@/components/auth/sign-in-buttons";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import {
    Carousel,
    CarouselControls,
    CarouselPanel,
} from "@/components/ui/carousel";
import { Footer } from "@/components/ui/footer";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import {
    ChromeIcon,
    GithubIcon,
    ModelContextProtocolIcon,
    TikTokIcon,
} from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/session";
import { cn } from "@/lib/common/cn";
import { BASE_URL, CACHE_EXTENSION_DOWNLOAD_URL } from "@/lib/common/constants";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { INTEGRATIONS } from "@/lib/integrations/support";
import LogoIconImage from "@/public/cache-app-icon.png";
import IconSmallImage from "@/public/cache-icon-small.png";
import CollectionsSectionImage from "@/public/collections-section-image.webp";
import HeroImage from "@/public/hero-image.webp";
import LibrarySectionImage from "@/public/library-section.webp";
import OrganizeSectionImage from "@/public/organize-section.webp";
import SmartCollectionsBackgroundImage from "@/public/smart-collections-background.webp";
import { LocaleSelector, T } from "gt-next";
import {
    Album,
    Bookmark,
    CircleCheck,
    CloudDownload,
    Component,
    Lightbulb,
    Search,
    SquareMousePointer,
    Terminal,
    Unlink,
    Workflow,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type * as React from "react";

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
            "home.metadata.description",
            "The AI bookmark manager for busy people. View, manage, and organize bookmarks across platforms."
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
        title: {
            absolute: `Cache | ${gtPublicString(
                locale,
                "home.metadata.title",
                "Unify your bookmarks across every platform"
            )}`,
        },
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
                name: "CachdApp, Inc.",
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
                        <T context="'Cache' is the product's name">
                            <h1 className="font-medium text-[3rem] leading-[98%] md:text-[4rem] md:tracking-[-0.21875rem]">
                                <GradientWaveText ariaLabel="Unify your bookmarks">
                                    Bookmark Intelligence
                                </GradientWaveText>
                            </h1>
                            <p className="font-medium text-base text-foreground leading-[1.22] tracking-[-3%] opacity-50 lg:max-w-[320px]">
                                Cache is the AI bookmark manager for busy
                                people. Collect, organize, and rediscover
                                everything you've saved across platforms.
                            </p>
                        </T>
                        <SignInButton hasServerSession={!!session} />
                        <SessionHint serverSession={session} />
                    </SidebarHeader>
                    <SidebarFooter>
                        <div className="hidden items-center gap-3 lg:flex">
                            <a
                                className="flex flex-col gap-1.5 pb-[2px] hover:opacity-60"
                                href={CACHE_EXTENSION_DOWNLOAD_URL}
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                <p className="font-medium text-foreground text-lg tracking-[-3%]">
                                    <T context="Chrome web store browser extension">
                                        Install the extension
                                    </T>
                                </p>
                                <p className="flex shrink-0 flex-row items-center gap-1.5 truncate text-base text-foreground leading-[1.22] tracking-[-3%]">
                                    <span>
                                        <ChromeIcon className="size-4" />
                                    </span>
                                    <span className="opacity-50">
                                        Chrome Web Store
                                    </span>
                                </p>
                            </a>
                        </div>
                        <LocaleSelector
                            id="language-selector"
                            name="language"
                        />
                    </SidebarFooter>
                </Sidebar>
                <div className="flex w-full max-w-[1024px] flex-col gap-12 p-8 pb-0 2xl:mx-auto">
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/70 bg-muted">
                        <Image
                            alt=""
                            className="absolute top-11 left-9 z-10 w-full rounded-xl"
                            fetchPriority="high"
                            loading="eager"
                            placeholder="blur"
                            priority
                            src={HeroImage}
                        />
                    </div>
                    <div className="mx-auto -mt-2 mb-3 flex max-w-prose flex-col items-center justify-center gap-1 text-center">
                        <p className="text-sm">
                            <T>
                                Save hours every week with a smarter way to
                                handle everything you save online. Make sense of
                                the noise — from just $8/month.
                            </T>
                        </p>
                        <Button
                            className="mt-0.5 text-muted-foreground"
                            render={
                                <a
                                    aria-label="GitHub Repository"
                                    href="/github"
                                    rel="noopener noreferrer"
                                    target="_blank"
                                />
                            }
                            size="sm"
                            variant="link"
                        >
                            <GithubIcon
                                aria-hidden
                                className="size-3.5"
                                focusable="false"
                            />
                            &nbsp;Open source – Truly yours
                        </Button>
                    </div>
                    <section className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-3 py-5 md:gap-4">
                            <T context="Library">
                                <h2 className="font-medium text-[28px] text-foreground leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Curate a library of all the content you love
                                </h2>
                                <p className="text-pretty font-medium text-base text-foreground leading-[1.2] tracking-[-3%] opacity-50">
                                    Get inspired, find that lesson, recipe, or
                                    idea you've been looking for, all in the
                                    span of a coffee break.
                                </p>
                            </T>
                            <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                <T context="Features">
                                    <li className="flex items-center gap-2">
                                        <Search className="inline-block size-4 shrink-0" />
                                        <span>
                                            Search the way you think, faster
                                            than ever
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Lightbulb className="inline-block size-4 shrink-0" />
                                        <span>
                                            Find new insights, and explore ideas
                                            with Cache's AI agent
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
                                    loading="eager"
                                    placeholder="blur"
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
                                <h2 className="font-medium text-[28px] text-foreground leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Bring in everything you've already saved
                                </h2>
                                <p className="text-pretty font-medium text-base text-foreground leading-[1.2] tracking-[-3%] opacity-50">
                                    Bring together bookmarks from your browser,
                                    socials, and videos automatically. Ditch the
                                    endless scrolling and tabbing through
                                    multiple platforms to find what matters most
                                    to you.
                                </p>
                            </T>
                            <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                <T context="Features">
                                    <li className="flex items-center gap-2">
                                        <SquareMousePointer className="inline-block size-4 shrink-0" />
                                        <span>
                                            Save from anywhere with the browser
                                            extension
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CloudDownload className="inline-block size-4 shrink-0" />
                                        <span>
                                            Share or export your collections
                                            from Cache anytime
                                        </span>
                                    </li>
                                </T>
                            </ul>
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
                                <h2 className="font-medium text-[28px] text-foreground leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Stop leaving it for "later"
                                </h2>
                                <p className="text-pretty font-medium text-base text-foreground leading-[1.2] tracking-[-3%] opacity-50">
                                    We all save things with good intentions,
                                    only to let them fade into a forgotten list.
                                    Cache brings your best saved content back to
                                    you when it's most useful.
                                </p>
                            </T>
                            <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                <T context="Features">
                                    <li className="flex items-center gap-2">
                                        <Workflow className="inline-block size-4 shrink-0" />
                                        <span>
                                            Set up simple routines that show you
                                            a daily digest of your recent saves,
                                            and more
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Bookmark className="inline-block size-4 shrink-0" />
                                        <span>
                                            Keep important links top of mind
                                            instead of buried in a backlog
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
                                <h2 className="font-medium text-[28px] text-foreground leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Search and explore from a single, fast feed
                                </h2>
                                <p className="text-pretty font-medium text-base text-foreground leading-[1.2] tracking-[-3%] opacity-50">
                                    Streamline the way you revisit your saved
                                    content through a modern and powerful
                                    interface, right in your browser.
                                </p>
                            </T>
                            <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                <T context="Features">
                                    <li className="flex items-center gap-2">
                                        <Terminal className="inline-block size-4 shrink-0" />
                                        <span>
                                            Use command menu and shortcuts for
                                            efficient workflows
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Album className="inline-block size-4 shrink-0" />
                                        <span>
                                            Read articles without distractions
                                            using Quick Look
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
                                <h2 className="font-medium text-[28px] text-foreground leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Spot the stale, keep the useful
                                </h2>
                                <p className="text-pretty font-medium text-base text-foreground leading-[1.2] tracking-[-3%] opacity-50">
                                    Build a knowledge base from the content
                                    you've already marked as important. Import
                                    scattered saves once and Cache organizes
                                    them in minutes.
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
                                    <li className="flex items-center gap-2">
                                        <Unlink className="inline-block size-4 shrink-0" />
                                        <span>
                                            Filter duplicates and broken links
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
                        <Carousel>
                            <div className="flex items-center justify-between">
                                <h2
                                    className="font-medium text-[28px] text-foreground leading-[1.1] tracking-[-1.28px] lg:text-[32px]"
                                    id="target-audience-carousel-heading"
                                >
                                    <T context="target audience">
                                        <span className="opacity-50">
                                            Use cases
                                        </span>
                                        <br />
                                        Cache is for…
                                    </T>
                                </h2>
                                <CarouselControls />
                            </div>
                            <CarouselPanel
                                aria-labelledby="target-audience-carousel-heading"
                                className="pb-10! [&>*:not(:last-child)]:me-4"
                                slideClassName="!w-[300px] md:!w-[340px]"
                            >
                                <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                    <h3 className="font-medium text-foreground text-lg tracking-[-0.5px]">
                                        <T>Curious readers</T>
                                    </h3>
                                    <p className="text-pretty font-medium text-[15px] text-foreground leading-[1.4] opacity-50">
                                        <T>
                                            Articles, essays, newsletters. A
                                            living library instead of a
                                            read‑later graveyard.
                                        </T>
                                    </p>
                                </div>
                                <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                    <h3 className="font-medium text-foreground text-lg tracking-[-0.5px]">
                                        <T>Writers and thinkers</T>
                                    </h3>
                                    <p className="text-pretty font-medium text-[15px] text-foreground leading-[1.4] opacity-50">
                                        <T>
                                            References, quotes, snippets. A
                                            searchable research stack for raw
                                            material.
                                        </T>
                                    </p>
                                </div>
                                <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                    <h3 className="font-medium text-foreground text-lg tracking-[-0.5px]">
                                        <T>Builders and developers</T>
                                    </h3>
                                    <p className="text-pretty font-medium text-[15px] text-foreground leading-[1.4] opacity-50">
                                        <T>
                                            Docs, issues, code, tutorials. Find
                                            that one link instantly.
                                        </T>
                                    </p>
                                </div>
                                <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                    <h3 className="font-medium text-foreground text-lg tracking-[-0.5px]">
                                        <T>Creators and curators</T>
                                    </h3>
                                    <p className="text-pretty font-medium text-[15px] text-foreground leading-[1.4] opacity-50">
                                        <T>
                                            Threads, videos, inspiration. Group
                                            ideas into collections and share
                                            them.
                                        </T>
                                    </p>
                                </div>
                                <div className="flex h-96 flex-col justify-between rounded-2xl border border-border/70 bg-background p-6">
                                    <h3 className="font-medium text-foreground text-lg tracking-[-0.5px]">
                                        <T>Productivity</T>
                                    </h3>
                                    <p className="text-pretty font-medium text-[15px] text-foreground leading-[1.4] opacity-50">
                                        <T>
                                            The missing step between bookmarking
                                            and note-taking. Structured,
                                            searchable, always there when you
                                            need it.
                                        </T>
                                    </p>
                                </div>
                            </CarouselPanel>
                        </Carousel>
                    </section>
                    <section className="flex w-full flex-col gap-8">
                        <div className="flex max-w-prose items-center gap-5">
                            <T>
                                <p className="font-medium text-lg text-muted-foreground tracking-tighter">
                                    <span className="font-normal text-foreground">
                                        You don't have to use Cache
                                        <br />
                                    </span>{" "}
                                    Let your AI agents use it with{" "}
                                    <ModelContextProtocolIcon className="mb-0.5 opacity-60" />{" "}
                                    <Popover>
                                        <PopoverTrigger
                                            nativeButton={false}
                                            openOnHover
                                            render={
                                                <span className="underline-thickness-2 cursor-help underline decoration-dotted underline-offset-4">
                                                    MCP
                                                </span>
                                            }
                                        />
                                        <PopoverPopup side="top">
                                            <div className="max-w-xs text-pretty text-sm">
                                                MCP is a universal connector —
                                                similar to a "USB port" for AI,
                                                but for software. It lets your
                                                AI agents securely access apps
                                                and data, so they can take
                                                actions and get work done for
                                                you — all without you needing to
                                                manually intervene.
                                            </div>
                                        </PopoverPopup>
                                    </Popover>{" "}
                                    and empower them with the full spectrum of
                                    your resources
                                </p>
                            </T>
                        </div>
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
