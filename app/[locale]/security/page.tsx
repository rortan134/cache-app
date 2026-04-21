import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SessionHint } from "@/components/auth/session";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/ui/footer";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import { PageShell } from "@/components/ui/page-shell";
import { Sidebar, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { getServerSession } from "@/lib/auth/server";
import { APP_NAME } from "@/lib/constants";
import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import LogoIconImage from "@/public/cache-app-icon.png";
import { LocaleSelector } from "gt-next";
import {
    ArrowUpRight,
    BadgeCheck,
    Bug,
    ChevronRight,
    CreditCard,
    FileLock2,
    KeyRound,
    Link2,
    Lock,
    Mail,
    Radar,
    ScrollText,
    ServerCog,
    Shield,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return {
        alternates: buildLocaleAlternates("/security"),
        description: gtPublicString(
            locale,
            "security.metadata.description",
            "How Cache approaches authentication, data access, logging, payments, platform integrations, and responsible security disclosure."
        ),
        title: gtPublicString(locale, "security.metadata.title", "Security"),
    };
}

interface SecurityCard {
    description: string;
    icon: typeof Shield;
    points: string[];
    title: string;
}

interface ResourceLink {
    description: string;
    href: string;
    title: string;
}

const securityCards: SecurityCard[] = [
    {
        description:
            "Cache accounts are authenticated through supported identity providers, with server-side session checks at protected routes and APIs.",
        icon: KeyRound,
        points: [
            "Google sign-in is enabled through Better Auth and Prisma-backed sessions.",
            "Native email-and-password login is disabled.",
            "Trusted origins and multi-session support are configured in the auth layer.",
        ],
        title: "Authentication & session controls",
    },
    {
        description:
            "Connected data access is intentionally scoped to the providers and permissions a user explicitly enables.",
        icon: Link2,
        points: [
            "Google Photos access uses the read-only picker scope for items a user chooses to import.",
            "Import routes require an authenticated session or an explicit user-scoped ingest token.",
            "Cache warns users to connect only accounts they trust and to review third-party permissions.",
        ],
        title: "Scoped provider access",
    },
    {
        description:
            "Input validation, token checks, and typed failures are part of the request boundary before data is written.",
        icon: ServerCog,
        points: [
            "Extension ingest endpoints reject missing or invalid Bearer tokens.",
            "Request bodies are validated with Zod before import work runs.",
            "Structured errors are normalized through typed domain error classes.",
        ],
        title: "Validated ingest paths",
    },
    {
        description:
            "Operational tooling is designed to reduce accidental exposure when engineers diagnose issues.",
        icon: FileLock2,
        points: [
            "Sensitive log keys such as tokens, secrets, cookies, and authorization fields are redacted.",
            "Entity-level redaction covers emails, phone numbers, IP addresses, and card numbers.",
            "Console logging is disabled in production and test environments.",
        ],
        title: "Reduced log exposure",
    },
    {
        description:
            "Billing is delegated to Stripe flows rather than handled directly in Cache UI or database models.",
        icon: CreditCard,
        points: [
            "Checkout, billing portal, and subscription webhooks are handled through Stripe.",
            "Cache stores billing state and Stripe identifiers, not raw card numbers.",
            "Payment configuration is guarded by required environment secrets.",
        ],
        title: "Payment separation",
    },
    {
        description:
            "The web application ships a baseline set of browser and transport hardening headers across routes.",
        icon: Shield,
        points: [
            "Strict-Transport-Security is enabled with preload and subdomain coverage.",
            "X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy are set globally.",
            "Security controls are applied through app configuration rather than per-page drift.",
        ],
        title: "Browser & transport hardening",
    },
];

const resources: ResourceLink[] = [
    {
        description:
            "How Cache collects, uses, stores, and shares account, library, billing, and Google user data.",
        href: "/legal/privacy-policy",
        title: "Privacy Policy",
    },
    {
        description:
            "Service terms, commercial framework language, and legal notice details for Cache.",
        href: "/legal/terms-of-service",
        title: "Terms of Service",
    },
    {
        description:
            "A single place for the product’s governing policies and disclosures.",
        href: "/legal",
        title: "Legal Center",
    },
];

const reportChecklist = [
    "A clear description of the issue and the affected URL, route, or workflow.",
    "Steps to reproduce, proof-of-concept details, and the likely impact if the issue is real.",
    "Your contact information so we can follow up while we investigate.",
];

const disclosureBoundaries = [
    "Please avoid accessing data that does not belong to you, degrading availability, or running destructive tests.",
    "Cache does not currently advertise a public bug bounty or formal security certification set on this page.",
    "No internet service can promise absolute security, so this page describes current controls rather than guarantees.",
];

export default async function SecurityPage() {
    const session = await getServerSession();

    return (
        <PageShell>
            <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:justify-between">
                <Sidebar>
                    <SidebarHeader>
                        <BrandLogo href="/library" src={LogoIconImage} />
                        <div className="flex flex-col gap-4 text-[#0A0B0D]">
                            <p className="font-medium text-[0.72rem] uppercase tracking-[0.26em] opacity-45">
                                Security Disclosure
                            </p>
                            <h1 className="font-medium text-[3rem] leading-[98%] md:text-[4rem] md:tracking-[-0.21875rem]">
                                <GradientWaveText ariaLabel="Security">
                                    Security.
                                </GradientWaveText>
                            </h1>
                            <p className="font-medium text-[1rem] leading-[1.22] tracking-[-3%] opacity-50 lg:max-w-[320px]">
                                How {APP_NAME} handles account security,
                                connected-platform access, operational
                                safeguards, and responsible vulnerability
                                reporting.
                            </p>
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
                            />
                        ) : (
                            <GoogleSignInButton>
                                Continue with Google
                            </GoogleSignInButton>
                        )}

                        <SessionHint serverSession={session} />

                        <div className="rounded-2xl border border-black/8 bg-black/[0.03] p-5 text-[#0A0B0D]">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
                                    <Mail className="size-4" />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-medium text-[0.82rem] uppercase tracking-[0.22em] opacity-55">
                                        Report a concern
                                    </p>
                                    <p className="text-sm leading-[1.45] opacity-75">
                                        Send security reports and buyer
                                        questionnaires to{" "}
                                        <a
                                            className="font-medium underline underline-offset-4"
                                            href="mailto:support@cachd.app?subject=Security%20report%20for%20Cache"
                                        >
                                            support@cachd.app
                                        </a>
                                        .
                                    </p>
                                </div>
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarFooter>
                        <div className="rounded-2xl border border-black/8 bg-white/70 p-4 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset]">
                            <p className="font-medium text-[0.72rem] uppercase tracking-[0.22em] opacity-45">
                                Current version
                            </p>
                            <p className="mt-2 text-sm leading-[1.45] opacity-70">
                                This disclosure reflects the product and code
                                path reviewed on April 21, 2026.
                            </p>
                        </div>
                        <LocaleSelector />
                    </SidebarFooter>
                </Sidebar>

                <div className="flex w-full max-w-[1080px] flex-col gap-14 px-8 py-8 2xl:mx-auto 2xl:px-10 2xl:py-10">
                    <section className="relative overflow-hidden rounded-[2rem] border border-stone-200/90 bg-[linear-gradient(145deg,rgba(248,248,247,0.96),rgba(255,255,255,0.9))] p-8 shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset] md:p-10">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -top-28 right-[-6rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(20,20,20,0.14)_0%,rgba(20,20,20,0.04)_38%,transparent_72%)] blur-2xl"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute bottom-0 left-[-5rem] h-48 w-80 rounded-full bg-[radial-gradient(circle,rgba(205,208,214,0.55)_0%,transparent_72%)] blur-2xl"
                        />

                        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                            <div className="space-y-5 text-[#0A0B0D]">
                                <p className="font-medium text-[0.75rem] uppercase tracking-[0.28em] opacity-45">
                                    Security & privacy posture
                                </p>
                                <h2 className="max-w-3xl font-medium text-4xl leading-[0.95] tracking-[-0.06em] md:text-[3.5rem]">
                                    Saved knowledge should feel retrievable,
                                    useful, and difficult to misuse.
                                </h2>
                                <p className="max-w-3xl text-[1.05rem] leading-[1.5] opacity-70">
                                    Cache is built around explicit user action:
                                    sign in through supported providers, connect
                                    only the accounts you trust, import only the
                                    content you choose, and keep billing outside
                                    the product through Stripe. This page
                                    summarizes the controls we can verify today,
                                    the boundaries we want buyers and
                                    researchers to understand, and how to reach
                                    us if you discover a security issue.
                                </p>
                            </div>

                            <div className="grid gap-3">
                                <SignalCard
                                    icon={<BadgeCheck className="size-4" />}
                                    text="Provider-backed authentication with server-side session checks"
                                />
                                <SignalCard
                                    icon={<Radar className="size-4" />}
                                    text="User-scoped extension ingest tokens with authenticated session gating"
                                />
                                <SignalCard
                                    icon={<CreditCard className="size-4" />}
                                    text="Stripe-managed checkout and billing flows"
                                />
                                <SignalCard
                                    icon={<Lock className="size-4" />}
                                    text="Global HSTS, frame, referrer, and permissions hardening headers"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {securityCards.map(
                            ({ description, icon: Icon, points, title }) => (
                                <article
                                    className="flex h-full flex-col gap-5 rounded-[1.75rem] border border-stone-200/90 bg-white/85 p-6 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset]"
                                    key={title}
                                >
                                    <div className="flex size-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
                                        <Icon className="size-5" />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="font-medium text-[1.45rem] leading-[1.05] tracking-[-0.04em]">
                                            {title}
                                        </h3>
                                        <p className="text-sm leading-[1.55] opacity-70">
                                            {description}
                                        </p>
                                    </div>
                                    <ul className="space-y-2.5 border-stone-200 border-t pt-4 text-sm leading-[1.5] opacity-80">
                                        {points.map((point) => (
                                            <li
                                                className="flex gap-2.5"
                                                key={point}
                                            >
                                                <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-stone-950/70" />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            )
                        )}
                    </section>

                    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                        <article className="rounded-[1.75rem] border border-stone-200/90 bg-stone-950 p-7 text-stone-50 shadow-sm">
                            <p className="font-medium text-[0.72rem] text-stone-300 uppercase tracking-[0.24em]">
                                What touches the system
                            </p>
                            <h2 className="mt-4 font-medium text-3xl tracking-[-0.05em]">
                                Data categories we actively think about.
                            </h2>
                            <p className="mt-4 max-w-xl text-[0.98rem] text-stone-300 leading-[1.6]">
                                Cache stores identity, saved-content metadata,
                                billing state, and operational signals required
                                to run the service. The product is opinionated
                                about separating those concerns rather than
                                blurring them together.
                            </p>
                        </article>

                        <div className="grid gap-4 md:grid-cols-3">
                            <InformationPanel
                                description="Names, email addresses, profile images, linked-provider identifiers, and session records used to keep accounts signed in."
                                icon={<KeyRound className="size-4" />}
                                title="Identity & access"
                            />
                            <InformationPanel
                                description="Imported links, captions, thumbnails, source identifiers, timestamps, collection metadata, and notes that make a Cache library useful."
                                icon={<ScrollText className="size-4" />}
                                title="Library content"
                            />
                            <InformationPanel
                                description="Subscription state, Stripe customer identifiers, device and browser metadata, IP or user-agent context, and feedback needed to operate securely."
                                icon={<CreditCard className="size-4" />}
                                title="Billing & operations"
                            />
                        </div>
                    </section>

                    <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                        <article className="rounded-[1.75rem] border border-stone-200/90 bg-white/85 p-7 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset]">
                            <p className="font-medium text-[0.72rem] uppercase tracking-[0.24em] opacity-45">
                                Honest disclosure
                            </p>
                            <h2 className="mt-4 font-medium text-3xl tracking-[-0.05em]">
                                Enterprise-minded does not mean pretending to be
                                further along than we are.
                            </h2>
                            <div className="mt-5 space-y-4 text-[0.98rem] leading-[1.65] opacity-80">
                                <p>
                                    Cache already includes meaningful baseline
                                    controls such as provider-backed auth,
                                    hardened headers, typed request validation,
                                    scoped import permissions, tokenized browser
                                    ingestion, and log sanitization.
                                </p>
                                <p>
                                    At the same time, this page is not a claim
                                    of SOC 2, ISO 27001, a public bug bounty, or
                                    a formal vendor trust portal. If and when
                                    those programs exist, they should be
                                    documented here explicitly rather than
                                    implied.
                                </p>
                                <p>
                                    If your team needs a deeper security review,
                                    architecture answer, or data-processing
                                    clarification before adopting Cache, email{" "}
                                    <a
                                        className="font-medium underline underline-offset-4"
                                        href="mailto:support@cachd.app?subject=Security%20question%20about%20Cache"
                                    >
                                        support@cachd.app
                                    </a>{" "}
                                    and include the scope of your review.
                                </p>
                            </div>
                        </article>

                        <div className="grid gap-4">
                            <ChecklistCard
                                icon={<BadgeCheck className="size-4" />}
                                items={[
                                    "Provider OAuth, session enforcement, and connected-account boundaries are implemented in code today.",
                                    "Sensitive fields and common personal data types are sanitized before structured logging paths emit them.",
                                    "Stripe is used for subscription billing instead of directly storing raw payment card details.",
                                ]}
                                title="What we can say today"
                            />
                            <ChecklistCard
                                icon={<ArrowUpRight className="size-4" />}
                                items={[
                                    "There is no promise of absolute security or zero risk.",
                                    "There is no public certification or bounty program asserted on this page today.",
                                    "Security answers for procurement should be requested directly rather than inferred.",
                                ]}
                                title="What we are not claiming"
                            />
                        </div>
                    </section>

                    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                        <article className="relative overflow-hidden rounded-[1.9rem] border border-stone-200/90 bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(245,245,244,0.96))] p-7 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset] md:p-8">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute top-0 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(24,24,27,0.13)_0%,transparent_72%)] blur-2xl"
                            />
                            <p className="font-medium text-[0.72rem] uppercase tracking-[0.24em] opacity-45">
                                Reporting security issues
                            </p>
                            <h2 className="mt-4 max-w-2xl font-medium text-3xl tracking-[-0.05em]">
                                Found a vulnerability or risky behavior? Report
                                it directly.
                            </h2>
                            <p className="mt-4 max-w-2xl text-[0.98rem] leading-[1.65] opacity-75">
                                We welcome good-faith reports from customers,
                                researchers, and partners. Include enough detail
                                for us to reproduce the issue responsibly, and
                                avoid testing that would expose someone else’s
                                data or degrade the service.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button
                                    render={
                                        <a href="mailto:support@cachd.app?subject=Security%20report%20for%20Cache">
                                            Send security report
                                            <Mail className="size-4" />
                                        </a>
                                    }
                                    size="xl"
                                />
                                <Button
                                    render={
                                        <Link href="/legal/privacy-policy">
                                            Review privacy policy
                                            <ChevronRight className="size-4" />
                                        </Link>
                                    }
                                    size="xl"
                                    variant="outline"
                                />
                            </div>
                        </article>

                        <div className="grid gap-4">
                            <ChecklistCard
                                icon={<Bug className="size-4" />}
                                items={reportChecklist}
                                title="Include in your report"
                            />
                            <ChecklistCard
                                icon={<Lock className="size-4" />}
                                items={disclosureBoundaries}
                                title="Good-faith boundaries"
                            />
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        {resources.map(({ description, href, title }) => (
                            <Link
                                className="group flex h-full flex-col justify-between rounded-[1.6rem] border border-stone-200/90 bg-white/85 p-6 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset] transition-transform duration-200 hover:-translate-y-0.5"
                                href={href}
                                key={href}
                            >
                                <div>
                                    <p className="font-medium text-[0.72rem] uppercase tracking-[0.22em] opacity-45">
                                        Resource
                                    </p>
                                    <h3 className="mt-3 font-medium text-[1.35rem] leading-[1.08] tracking-[-0.04em]">
                                        {title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-[1.55] opacity-70">
                                        {description}
                                    </p>
                                </div>
                                <div className="mt-5 flex items-center gap-2 font-medium text-sm">
                                    Open
                                    <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </div>
                            </Link>
                        ))}
                    </section>

                    <Footer />
                </div>
            </div>
        </PageShell>
    );
}

function SignalCard({
    icon,
    text,
}: Readonly<{
    icon: ReactNode;
    text: string;
}>) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-stone-200/90 bg-white/80 px-4 py-3 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset]">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white">
                {icon}
            </div>
            <p className="text-sm leading-[1.45] opacity-80">{text}</p>
        </div>
    );
}

function InformationPanel({
    description,
    icon,
    title,
}: Readonly<{
    description: string;
    icon: ReactNode;
    title: string;
}>) {
    return (
        <article className="rounded-[1.5rem] border border-stone-200/90 bg-white/85 p-5 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset]">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-black text-white">
                {icon}
            </div>
            <h3 className="mt-4 font-medium text-[1.15rem] tracking-[-0.03em]">
                {title}
            </h3>
            <p className="mt-3 text-sm leading-[1.55] opacity-75">
                {description}
            </p>
        </article>
    );
}

function ChecklistCard({
    icon,
    items,
    title,
}: Readonly<{
    icon: ReactNode;
    items: string[];
    title: string;
}>) {
    return (
        <article className="rounded-[1.5rem] border border-stone-200/90 bg-white/85 p-6 text-[#0A0B0D] shadow-[0_1px_0_0_rgb(255_255_255/0.7)_inset]">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-900">
                    {icon}
                </div>
                <h3 className="font-medium text-[1.15rem] tracking-[-0.03em]">
                    {title}
                </h3>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-[1.55] opacity-80">
                {items.map((item) => (
                    <li className="flex gap-2.5" key={item}>
                        <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-stone-950/70" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </article>
    );
}
