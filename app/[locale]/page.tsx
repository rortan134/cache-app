import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SessionHint } from "@/components/auth/session";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/ui/footer";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { Chrome } from "@/components/ui/integration-icons";
import { LogoContextMenu } from "@/components/ui/logo-context-menu";
import { PageShell } from "@/components/ui/page-shell";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { buildLocaleAlternates } from "@/lib/alternates";
import { getServerSession } from "@/lib/auth/server";
import { gtPublicString } from "@/lib/gt-public-json";
import { INTEGRATIONS } from "@/lib/integrations/supports";
import LogoIconImage from "@/public/cache-app-icon.png";
import QRCodeDownloadImage from "@/public/download-qrcode.png";
import { LocaleSelector, T } from "gt-next";
import { ChevronRight, CloudDownload, Component, Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return {
        alternates: buildLocaleAlternates("/"),
        description: gtPublicString(
            locale,
            "home.metadata.description",
            "One place to view, manage, and organize bookmarks across browsers and platforms — built for power users who save at volume."
        ),
        title: gtPublicString(
            locale,
            "home.metadata.title",
            "Unify your bookmarks across every platform"
        ),
    };
}

export default async function Home() {
    const session = await getServerSession();

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <Sidebar>
                    <SidebarHeader>
                        <LogoContextMenu href="/library" src={LogoIconImage} />
                        <div className="flex flex-col gap-3">
                            <T context="'Cache' is the product's name">
                                <h1 className="font-medium text-[3rem] leading-[98%] md:text-[4rem] md:tracking-[-0.21875rem]">
                                    <GradientWaveText ariaLabel="Unify your bookmarks">
                                        Unify your bookmarks.
                                    </GradientWaveText>
                                </h1>
                                <p className="font-medium text-[#0A0B0D] text-[1rem] leading-[1.22] tracking-[-3%] opacity-50 lg:max-w-[320px]">
                                    Meet Cache – one place to collect, organize,
                                    and rediscover everything you’ve saved
                                    across platforms, right in your browser.
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
                                        <Chrome className="size-4" />
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
                    <div className="aspect-video h-auto w-full rounded-2xl bg-muted" />
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Library">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Curate a library of all the content you love
                                </h2>
                                <p className="tracking=[-3%] text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] opacity-50">
                                    Get inspired, find that one lesson, advice,
                                    recipe, or idea you've been looking for, in
                                    the span of a coffee break.
                                </p>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                {/* <Image alt="" height={800} src="" width={800} /> */}
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Integrations">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Connect your favorite media platforms –
                                    Backfill everything you've ever saved
                                </h2>
                                <p className="tracking=[-3%] text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] opacity-50">
                                    Bring together bookmarks from social, video,
                                    and the browser automatically. Ditch the
                                    endless scrolling and tabbing through
                                    multiple platforms to find what matters to
                                    you.
                                </p>
                            </T>
                            <div className="mt-2 flex w-full items-center gap-5">
                                {INTEGRATIONS.map(({ id, Icon }) => (
                                    <Icon className="size-6" key={id} />
                                ))}
                            </div>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                {/* <Image alt="" height={800} src="" width={800} /> */}
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Feed">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Search and explore from a single, fast feed
                                </h2>
                                <p className="tracking=[-3%] text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] opacity-50">
                                    Streamline the way you consume and reengage
                                    with your saved content from a single clean
                                    and powerful interface.
                                </p>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                {/* <Image alt="" height={800} src="" width={800} /> */}
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Habits">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Stop leaving it for "later"
                                </h2>
                                <p className="tracking=[-3%] text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] opacity-50">
                                    Create more actionable opportunities for
                                    yourself by having your most insightful
                                    saved content top of mind instead of losing
                                    them in a backlog of forgotten bookmarks.
                                </p>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                {/* <Image alt="" height={800} src="" width={800} /> */}
                            </figure>
                        </div>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:gap-[40px]">
                        <div className="flex max-w-[340px] flex-col gap-[12px] py-[20px] md:gap-[16px]">
                            <T context="Organization">
                                <h2 className="font-medium text-[#0A0B0D] text-[28px] leading-[1.1] tracking-[-1.28px] lg:text-[32px]">
                                    Stay organized. Spot the stale, keep the
                                    useful
                                </h2>
                                <p className="tracking=[-3%] text-pretty font-medium font-regular text-[#0A0B0D] text-[16px] leading-[1.2] opacity-50">
                                    Import once and go from messy to organized
                                    in minutes.
                                </p>
                                <ul className="mt-2 flex flex-col space-y-2 text-xs">
                                    <li className="flex items-center gap-2">
                                        <Component className="inline-block size-4 shrink-0" />
                                        <span>
                                            Smart Collections helps you separate
                                            the actionable from the inspiration
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs">
                                        <Search className="inline-block size-4 shrink-0" />
                                        <span>
                                            Find anything with associative
                                            search with OCR built-in
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2 text-xs">
                                        <CloudDownload className="inline-block size-4 shrink-0" />
                                        <span>
                                            Export or move out from Cache at any
                                            time you want
                                        </span>
                                    </li>
                                </ul>
                            </T>
                        </div>
                        <div className="order-first aspect-square w-full overflow-hidden rounded-2xl bg-muted md:order-last">
                            <figure className="overflow-hidden">
                                {/* <Image alt="" height={800} src="" width={800} /> */}
                            </figure>
                        </div>
                    </div>
                    <Footer />
                </div>
            </div>
        </PageShell>
    );
}
