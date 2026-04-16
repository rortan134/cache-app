import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
    SessionHint,
    SignedInOnly,
    SignedOutOnly,
} from "@/components/auth/session";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/ui/footer";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { PageShell } from "@/components/ui/page-shell";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { buildLocaleAlternates } from "@/lib/alternates";
import { gtPublicString } from "@/lib/gt-public-json";
import LogoIconImage from "@/public/cache-app-icon.png";
import { LocaleSelector, T } from "gt-next";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return {
        alternates: buildLocaleAlternates("/manifesto"),
        description: gtPublicString(
            locale,
            "manifesto.metadata.description",
            "The scroll becomes a library. Meaning isn't in the feed. It's in what you choose to keep."
        ),
        title: gtPublicString(locale, "manifesto.metadata.title", "Manifesto"),
    };
}

export default function Manifesto() {
    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <Sidebar>
                    <SidebarHeader>
                        <BrandLogo href="/library" src={LogoIconImage} />
                        <div className="flex flex-col gap-3">
                            <T context="Manifesto title">
                                <h1 className="font-medium text-[3rem] leading-[98%] md:text-[4rem] md:tracking-[-0.21875rem]">
                                    <GradientWaveText ariaLabel="Manifesto">
                                        Manifesto.
                                    </GradientWaveText>
                                </h1>
                                <p className="font-medium text-[#0A0B0D] text-[1rem] leading-[1.22] tracking-[-3%] opacity-50 lg:max-w-[320px]">
                                    Why we built Cache.
                                </p>
                            </T>
                        </div>
                        <SignedOutOnly>
                            <GoogleSignInButton>
                                <T context="Sign in/up CTA button">
                                    Continue with Google
                                </T>
                            </GoogleSignInButton>
                        </SignedOutOnly>
                        <SignedInOnly>
                            <Button
                                render={
                                    <Link href="/library">
                                        Go to my library
                                        <ChevronRight className="size-4" />
                                    </Link>
                                }
                                size="xl"
                            />
                        </SignedInOnly>
                        <SessionHint />
                    </SidebarHeader>
                    <SidebarFooter>
                        <LocaleSelector />
                    </SidebarFooter>
                </Sidebar>
                <div className="flex w-full max-w-[800px] flex-col gap-16 px-8 py-16 2xl:mx-auto">
                    <article className="flex flex-col gap-12 text-[#0A0B0D]">
                        <section className="flex flex-col gap-6">
                            <T context="Manifesto Section 1">
                                <h2 className="font-medium text-[2rem] leading-[1.1] tracking-[-0.05rem]">
                                    You're Going to Scroll Anyway
                                </h2>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    Nobody quits the feeds.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    We've tried. We deleted the apps, set the
                                    timers, felt the guilt.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    Then we came back.
                                </p>
                            </T>
                        </section>
                        <hr className="opacity-10" />
                        <section className="flex flex-col gap-6">
                            <T context="Manifesto Section 2">
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    So let's be honest about what's actually
                                    happening.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    You scroll because the world is interesting.
                                    Because someone out there just said the
                                    thing you've been trying to articulate for
                                    years. Because there's a recipe, a thread, a
                                    two-minute video that will actually change
                                    how you think about something.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    The problem isn't that you're consuming.
                                </p>
                                <p className="font-medium text-[1.5rem] leading-[1.3]">
                                    The problem is that you're consuming with
                                    amnesia.
                                </p>
                            </T>
                        </section>
                        <hr className="opacity-10" />
                        <section className="flex flex-col gap-6">
                            <T context="Manifesto Section 3">
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    There has never been more content.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    There has rarely been less meaning.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    The feed is infinite but it doesn't
                                    accumulate. Every insight is immediately
                                    buried by the next one. Every idea arrives
                                    without context, without connection to the
                                    last thing that moved you. Volume without
                                    retention is just noise.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    You're not lacking information. You're
                                    lacking a place for it to land.
                                </p>
                            </T>
                        </section>
                        <hr className="opacity-10" />
                        <section className="flex flex-col gap-6">
                            <T context="Manifesto Section 4">
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    You save it for later. Later never comes.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    The bookmark disappears into a graveyard of
                                    good intentions, scattered across five
                                    platforms, two browsers, three devices. The
                                    insight evaporates. The loop resets.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    You scroll again, looking for the thing you
                                    already found.
                                </p>
                            </T>
                        </section>
                        <hr className="opacity-10" />
                        <section className="flex flex-col gap-6">
                            <T context="Manifesto Section 5">
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    Your attention is finite.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    You spend it whether you mean to or not.
                                    Every scroll is a withdrawal. Most of us
                                    treat it like it's free, limitless,
                                    renewable, consequence-free.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    The question isn't whether you'll spend it.
                                    It's whether you'll have anything to show
                                    for it.
                                </p>
                                <p className="font-medium text-[1.75rem] leading-[1.2] tracking-[-0.02rem]">
                                    Cache is not a cure. It's a memory.
                                </p>
                            </T>
                        </section>
                        <hr className="opacity-10" />
                        <section className="flex flex-col gap-6">
                            <T context="Manifesto Section 6">
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    Every time you hit save, you're making a
                                    small bet that this moment of attention was
                                    worth something.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    Cache collects those bets. It pulls your
                                    saves out of the silos — the tweets, the
                                    videos, the links — and puts them somewhere
                                    you can actually return to and get something
                                    out of.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    The scroll becomes a library.
                                </p>
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    The consumption loop becomes a record of
                                    what caught your eye, what made you think,
                                    what you wanted to hold onto.
                                </p>
                                <p className="font-medium text-[1.5rem] leading-[1.3]">
                                    Meaning isn't in the feed. It's in what you
                                    choose to keep.
                                </p>
                            </T>
                        </section>
                        <hr className="opacity-10" />
                        <section className="flex flex-col gap-6 pb-20">
                            <T context="Manifesto Section 7">
                                <p className="text-[1.25rem] leading-[1.4] opacity-80">
                                    You're already paying attention.
                                </p>
                                <p className="font-medium text-[2rem] leading-[1.2] tracking-[-0.03rem]">
                                    Cache makes sure it compounds.
                                </p>
                            </T>
                        </section>
                    </article>
                    <Footer />
                </div>
            </div>
        </PageShell>
    );
}
