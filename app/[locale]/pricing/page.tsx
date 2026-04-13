import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SignedInOnly, SignedOutOnly } from "@/components/auth/session";
import { PricingUpgradeButton } from "@/components/billing/pricing-upgrade-button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer } from "@/components/ui/footer";
import { PageShell } from "@/components/ui/page-shell";
import { buildLocaleAlternates } from "@/lib/alternates";
import { gtPublicString } from "@/lib/gt-public-json";
import { T } from "gt-next";
import { Check, Lock, ShieldCheck, TrendingDown } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return {
        alternates: buildLocaleAlternates("/pricing"),
        description: gtPublicString(
            locale,
            "pricing.metadata.description",
            "Simple pricing for power users who want one place to organize and rediscover everything they save."
        ),
        title: gtPublicString(locale, "pricing.metadata.title", "Pricing"),
    };
}

export default async function PricingPage({
    params,
}: Readonly<{
    params: Promise<{ locale: string }>;
}>) {
    const { locale } = await params;

    return (
        <PageShell className="bg-background">
            <section className="relative overflow-hidden px-6 pt-16 md:px-10 md:pt-24">
                <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-muted via-muted/50 to-transparent" />
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
                    <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
                        <T context="Pricing page hero copy">
                            <h1 className="font-medium text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
                                Give your every bookmark more meaning.
                            </h1>
                            <p className="max-w-2xl text-base text-muted-foreground leading-[1.35] md:text-[1.15rem]">
                                Starting from only 5 € per month — Cancel
                                anytime.
                            </p>
                            <p className="max-w-2xl text-base text-muted-foreground">
                                <strong className="font-medium text-blue-700">
                                    Save 2 months
                                </strong>{" "}
                                on a yearly subscription
                            </p>
                        </T>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-[2rem] border border-border bg-card p-7 shadow-xs md:p-10">
                            <div className="flex flex-col gap-6">
                                <T context="Pricing page feature section">
                                    <div className="space-y-3">
                                        <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
                                            What you get
                                        </p>
                                        <h2 className="font-medium text-3xl tracking-[-0.04em] md:text-4xl">
                                            One subscription for your entire
                                            saved-content workflow
                                        </h2>
                                    </div>
                                </T>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Check
                                                className="size-3.5"
                                                strokeWidth={3}
                                            />
                                        </span>
                                        <T context="Pricing page feature bullet">
                                            <p className="text-pretty text-[0.98rem] leading-6">
                                                Bring together bookmarks from
                                                browsers, social apps, and
                                                supported platforms.
                                            </p>
                                        </T>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Check
                                                className="size-3.5"
                                                strokeWidth={3}
                                            />
                                        </span>
                                        <T context="Pricing page feature bullet">
                                            <p className="text-pretty text-[0.98rem] leading-6">
                                                Search, organize, and resurface
                                                saved content from one library.
                                            </p>
                                        </T>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Check
                                                className="size-3.5"
                                                strokeWidth={3}
                                            />
                                        </span>
                                        <T context="Pricing page feature bullet">
                                            <p className="text-pretty text-[0.98rem] leading-6">
                                                Keep every current Cache feature
                                                unlocked as your archive grows.
                                            </p>
                                        </T>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Check
                                                className="size-3.5"
                                                strokeWidth={3}
                                            />
                                        </span>
                                        <T context="Pricing page feature bullet">
                                            <p className="text-pretty text-[0.98rem] leading-6">
                                                Choose monthly flexibility or
                                                yearly savings with the same Pro
                                                plan.
                                            </p>
                                        </T>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="rounded-[2rem] border border-primary/15 bg-muted p-3 shadow-xs">
                            <div className="flex h-full flex-col rounded-[1.4rem] border border-border bg-background p-7 md:p-10">
                                <div className="flex items-start justify-between gap-4">
                                    <T context="Pricing page plan heading">
                                        <div className="space-y-2">
                                            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                                                Pro plan
                                            </p>
                                            <h2 className="text-balance font-medium text-3xl tracking-[-0.04em]">
                                                Everything in Cache
                                            </h2>
                                        </div>
                                    </T>
                                </div>
                                <div className="mt-8 grid gap-3">
                                    <div className="rounded-2xl border border-border bg-card px-5 py-4">
                                        <T context="Monthly billing option">
                                            <div className="flex items-end justify-between gap-4">
                                                <div>
                                                    {/* <p className="text-muted-foreground text-sm">
                                                        Monthly
                                                    </p> */}
                                                    <p className="mt-1 font-medium text-4xl tracking-[-0.04em]">
                                                        5 €
                                                        <span className="ml-2 font-normal text-base text-muted-foreground">
                                                            per month
                                                        </span>
                                                    </p>
                                                </div>
                                                <p className="text-muted-foreground text-sm">
                                                    Billed monthly
                                                </p>
                                            </div>
                                        </T>
                                    </div>
                                    <div className="rounded-2xl border border-primary/20 bg-primary/3 px-5 py-4">
                                        <T context="Yearly billing option">
                                            <div className="flex items-end justify-between gap-4">
                                                <div>
                                                    {/* <p className="text-muted-foreground text-sm">
                                                        Yearly
                                                    </p> */}
                                                    <p className="mt-1 font-medium text-4xl tracking-[-0.04em]">
                                                        50 €
                                                        <span className="ml-2 font-normal text-base text-muted-foreground">
                                                            per year
                                                        </span>
                                                    </p>
                                                </div>
                                                <p className="max-w-28 text-right text-muted-foreground text-sm">
                                                    Billed yearly
                                                </p>
                                            </div>
                                        </T>
                                    </div>
                                </div>
                                <div className="mt-8 flex flex-col gap-3">
                                    <SignedOutOnly>
                                        <GoogleSignInButton>
                                            <T context="Pricing page sign-in CTA">
                                                Continue with Google
                                            </T>
                                        </GoogleSignInButton>
                                    </SignedOutOnly>
                                    <SignedInOnly>
                                        <PricingUpgradeButton locale={locale}>
                                            <T context="Pricing page upgrade CTA">
                                                Upgrade plan
                                            </T>
                                        </PricingUpgradeButton>
                                    </SignedInOnly>
                                </div>
                                <div className="mt-8 grid gap-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                                        <T context="Pricing page trust signal">
                                            <p className="text-muted-foreground text-sm">
                                                Up to 30-day money back
                                                guarantee
                                            </p>
                                        </T>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <TrendingDown className="size-4 shrink-0 text-muted-foreground" />
                                        <T context="Pricing page trust signal">
                                            <p className="text-muted-foreground text-sm">
                                                Save with annual subscriptions
                                            </p>
                                        </T>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Lock className="size-4 shrink-0 text-muted-foreground" />
                                        <T context="Pricing page trust signal">
                                            <p className="text-muted-foreground text-sm">
                                                Buy with flexibility and
                                                security
                                            </p>
                                        </T>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mx-auto mt-20 w-full max-w-3xl pb-20">
                        <T context="FAQ section heading">
                            <h2 className="mb-10 text-center font-medium text-3xl tracking-tight md:text-4xl">
                                Frequently Asked Questions
                            </h2>
                        </T>
                        <Accordion
                            className="w-full border-border border-t"
                            defaultValue={["item-0"]}
                        >
                            <AccordionItem value="item-0">
                                <AccordionTrigger className="text-lg md:text-xl">
                                    <T context="FAQ question">What is Cache?</T>
                                </AccordionTrigger>
                                <AccordionContent className="text-[0.95rem] leading-relaxed md:text-base">
                                    <T context="FAQ answer">
                                        Cache is a unified library for
                                        everything you save online. We bring
                                        together your bookmarks, liked photos,
                                        and saved content from various platforms
                                        into one searchable, organized space.
                                    </T>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-lg md:text-xl">
                                    <T context="FAQ question">
                                        How often is my content updated?
                                    </T>
                                </AccordionTrigger>
                                <AccordionContent className="text-[0.95rem] leading-relaxed md:text-base">
                                    <T context="FAQ answer">
                                        We sync your connected integrations
                                        automatically. Whether it's a new Google
                                        Photo or a Pinterest Pin, Cache keeps
                                        your library up to date so you can find
                                        what you need instantly.
                                    </T>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-2">
                                <AccordionTrigger className="text-lg md:text-xl">
                                    <T context="FAQ question">
                                        Do you have discounts for students?
                                    </T>
                                </AccordionTrigger>
                                <AccordionContent className="text-[0.95rem] leading-relaxed md:text-base">
                                    <T context="FAQ answer">
                                        Yes! We believe in supporting students
                                        and educators. Please contact our
                                        support team with your academic email to
                                        receive a special discount code.
                                    </T>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-3">
                                <AccordionTrigger className="text-lg md:text-xl">
                                    <T context="FAQ question">
                                        What payment methods do you accept?
                                    </T>
                                </AccordionTrigger>
                                <AccordionContent className="text-[0.95rem] leading-relaxed md:text-base">
                                    <T context="FAQ answer">
                                        We accept all major credit cards (Visa,
                                        Mastercard, American Express) and
                                        digital wallets through our secure
                                        payment processor, Stripe.
                                    </T>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-4">
                                <AccordionTrigger className="text-lg md:text-xl">
                                    <T context="FAQ question">
                                        Can I cancel my subscription?
                                    </T>
                                </AccordionTrigger>
                                <AccordionContent className="text-[0.95rem] leading-relaxed md:text-base">
                                    <T context="FAQ answer">
                                        Of course. You can cancel your Pro
                                        subscription at any time from your
                                        account settings. You'll continue to
                                        have access to Pro features until the
                                        end of your billing period.
                                    </T>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-5">
                                <AccordionTrigger className="text-lg md:text-xl">
                                    <T context="FAQ question">
                                        Do you offer plans for teams?
                                    </T>
                                </AccordionTrigger>
                                <AccordionContent className="text-[0.95rem] leading-relaxed md:text-base">
                                    <T context="FAQ answer">
                                        Currently, we focus on providing the
                                        best experience for individual power
                                        users. If you're interested in using
                                        Cache with your team, please reach out
                                        to us—we'd love to hear about your
                                        needs.
                                    </T>
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="item-6">
                                <AccordionTrigger className="text-lg md:text-xl">
                                    <T context="FAQ question">
                                        What is your refund policy?
                                    </T>
                                </AccordionTrigger>
                                <AccordionContent className="text-[0.95rem] leading-relaxed md:text-base">
                                    <T context="FAQ answer">
                                        We offer a 30-day money-back guarantee.
                                        If Cache isn't right for you, just let
                                        us know within 30 days of your initial
                                        purchase for a full refund.
                                    </T>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
                <Footer />
            </section>
        </PageShell>
    );
}
