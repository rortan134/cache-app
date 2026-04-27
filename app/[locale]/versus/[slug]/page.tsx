import { Footer } from "@/components/ui/footer";
import { PageShell } from "@/components/ui/page-shell";
import { BASE_URL } from "@/lib/common/constants";
import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    getEntriesByCategory,
    getVersusCategory,
    getVersusEntry,
    versusEntries,
} from "../data";

interface VersusDetailPageProps {
    params: Promise<{
        locale: string;
        slug: string;
    }>;
}

export function generateStaticParams() {
    return versusEntries.map((entry) => ({
        slug: entry.slug,
    }));
}

export async function generateMetadata({
    params,
}: VersusDetailPageProps): Promise<Metadata> {
    const { slug } = await params;
    const entry = getVersusEntry(slug);

    if (!entry) {
        return {};
    }

    const title = `Cache App vs ${entry.name}`;
    const description = `Compare Cache App vs ${entry.name} for saved-content organization, search, and rediscovery. See who each product is best for and when Cache is the better fit.`;
    const path = `/versus/${entry.slug}` as `/${string}`;

    return {
        alternates: buildLocaleAlternates(path),
        description,
        keywords: [
            `Cache App vs ${entry.name}`,
            `${entry.name} alternative`,
            `${entry.name} competitor`,
            `Cache alternative to ${entry.name}`,
            `${entry.name} comparison`,
        ],
        openGraph: {
            description,
            title,
            type: "article",
        },
        title,
        twitter: {
            card: "summary_large_image",
            description,
            title,
        },
    };
}

export default async function VersusDetailPage({
    params,
}: VersusDetailPageProps) {
    const { slug } = await params;
    const entry = getVersusEntry(slug);

    if (!entry) {
        notFound();
    }

    const category = getVersusCategory(entry.categoryId);
    const relatedEntries = getEntriesByCategory(entry.categoryId)
        .filter((candidate) => candidate.slug !== entry.slug)
        .slice(0, 4);

    const title = `Cache App vs ${entry.name}`;

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                item: `${BASE_URL}/versus`,
                name: "Versus",
                position: 1,
            },
            {
                "@type": "ListItem",
                item: `${BASE_URL}/versus/${entry.slug}`,
                name: title,
                position: 2,
            },
        ],
    };

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: buildFaqs(entry, category).map((faq) => ({
            "@type": "Question",
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
            name: faq.question,
        })),
    };

    return (
        <PageShell className="bg-[#111111] text-white">
            <script type="application/ld+json">
                {JSON.stringify(breadcrumbJsonLd)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(faqJsonLd)}
            </script>

            <section className="border-white/8 border-b px-6 pt-10 pb-16 md:px-10 md:pt-14 md:pb-24">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="flex flex-wrap items-center gap-3 text-[0.72rem] text-white/45 uppercase tracking-[0.2em]">
                        <Link
                            className="transition-colors hover:text-white"
                            href="/versus"
                        >
                            Versus
                        </Link>
                        <span>/</span>
                        <span>{category.shortLabel}</span>
                    </div>

                    <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
                        <div className="max-w-2xl">
                            <span className="inline-flex rounded-full border border-white/12 bg-white/6 px-3 py-1 font-medium text-[0.7rem] text-white/72 uppercase tracking-[0.22em]">
                                {category.label}
                            </span>
                            <h1 className="mt-6 text-balance font-medium text-4xl leading-[0.92] tracking-[-0.06em] md:text-6xl">
                                {title}
                            </h1>
                            <p className="mt-5 max-w-xl text-pretty text-[1.02rem] text-white/68 leading-7">
                                Cache is built for unifying what you save across
                                platforms and making it useful later.{" "}
                                {entry.name} is better known for {entry.focus}.
                                This page is for people deciding which workflow
                                fits their saved-content habits better.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    className="inline-flex items-center justify-center rounded-full bg-[#F2FF3A] px-5 py-3 font-medium text-[#111111] transition-transform hover:-translate-y-0.5"
                                    href="/pricing"
                                >
                                    Start with Cache
                                </Link>
                                <a
                                    className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/4 px-5 py-3 font-medium text-white transition-colors hover:bg-white/8"
                                    href={entry.website}
                                    rel="noreferrer noopener"
                                    target="_blank"
                                >
                                    Visit {entry.name}
                                </a>
                            </div>
                            <div className="mt-10 grid gap-3 sm:grid-cols-3">
                                <StatCard
                                    label="Alternative type"
                                    value={category.shortLabel}
                                />
                                <StatCard
                                    label={`${entry.name} focus`}
                                    value={entry.domain}
                                />
                                <StatCard
                                    label="Cache promise"
                                    value="Useful saved knowledge"
                                />
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
                            <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
                                <div className="flex items-center justify-between">
                                    <span className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] text-white/55 uppercase tracking-[0.18em]">
                                        At a glance
                                    </span>
                                    <span className="text-[0.7rem] text-white/42 uppercase tracking-[0.18em]">
                                        Data-driven summary
                                    </span>
                                </div>
                                <div className="mt-5 grid gap-3">
                                    <PreviewLine
                                        label="Cache"
                                        value={category.cachePositioning}
                                    />
                                    <PreviewLine
                                        label={entry.name}
                                        value={entry.alternativeLabel}
                                    />
                                    <PreviewLine
                                        label="Best for"
                                        value={entry.bestFor}
                                    />
                                </div>
                                <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                                    <p className="font-medium text-[0.72rem] text-white/45 uppercase tracking-[0.2em]">
                                        Editorial angle
                                    </p>
                                    <p className="mt-3 text-sm text-white/72 leading-6">
                                        {category.heroSummary}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-[#F7F3EE] px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="max-w-3xl">
                        <p className="font-medium text-[0.72rem] text-black/45 uppercase tracking-[0.22em]">
                            Top reasons
                        </p>
                        <h2 className="mt-4 text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                            Why people may choose Cache over {entry.name}
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-4 lg:grid-cols-3">
                        {category.reasons.map((reason) => (
                            <div
                                className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.05)]"
                                key={reason.title}
                            >
                                <p className="font-medium text-[0.72rem] text-black/42 uppercase tracking-[0.2em]">
                                    Cache advantage
                                </p>
                                <h3 className="mt-4 text-2xl tracking-[-0.04em]">
                                    {reason.title}
                                </h3>
                                <p className="mt-4 text-pretty text-black/62 leading-7">
                                    {reason.description} In the case of{" "}
                                    {entry.name}, the main tradeoff is its focus
                                    on {entry.focus}.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-white px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                    <div>
                        <p className="font-medium text-[0.72rem] text-black/45 uppercase tracking-[0.22em]">
                            Quick take
                        </p>
                        <h2 className="mt-4 text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                            Where Cache and {entry.name} diverge
                        </h2>
                        <p className="mt-5 max-w-lg text-pretty text-black/62 leading-7">
                            {entry.name} is a strong choice for {entry.bestFor}.
                            Cache makes more sense if your problem is broader:
                            too many saves, too many platforms, and too little
                            reliable retrieval when something becomes relevant
                            again.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-[#FAF8F4] shadow-[0_18px_50px_rgba(17,17,17,0.05)]">
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-black/8 border-b bg-black px-5 py-4 text-sm text-white">
                            <span>Dimension</span>
                            <span>Cache</span>
                            <span>{entry.name}</span>
                        </div>
                        {category.comparisonRows.map((row) => (
                            <div
                                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-black/8 border-b px-5 py-5 last:border-b-0"
                                key={row.label}
                            >
                                <div>
                                    <p className="font-medium tracking-[-0.03em]">
                                        {row.label}
                                    </p>
                                </div>
                                <p className="text-black/68 text-sm leading-6">
                                    {row.cacheValue}
                                </p>
                                <p className="text-black/68 text-sm leading-6">
                                    {row.competitorValue}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#F7F3EE] px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <DecisionCard
                            eyebrow="Choose Cache if"
                            items={[
                                "You want one search layer across social saves, links, media, and platform bookmarks.",
                                "You care about turning saved content into collections, synthesis, and action.",
                                "You want a product purpose-built for retrieval, not only reading, pinning, or note-taking.",
                            ]}
                            title="You want a working library, not just another destination."
                        />
                        <DecisionCard
                            eyebrow={`Choose ${entry.name} if`}
                            items={[
                                `You specifically want a product focused on ${entry.focus}.`,
                                `You identify most with ${entry.bestFor}.`,
                                `You prefer a workflow centered on ${category.competitorPositioning.toLowerCase()}.`,
                            ]}
                            title={`You mainly want ${entry.name}'s native workflow.`}
                        />
                    </div>
                </div>
            </section>

            <section className="bg-white px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="max-w-3xl">
                        <p className="font-medium text-[0.72rem] text-black/45 uppercase tracking-[0.22em]">
                            FAQ
                        </p>
                        <h2 className="mt-4 text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                            Common questions about Cache vs {entry.name}
                        </h2>
                    </div>
                    <div className="mt-12 grid gap-4">
                        {buildFaqs(entry, category).map((faq) => (
                            <div
                                className="rounded-[1.8rem] border border-black/8 bg-[#FAF8F4] p-6"
                                key={faq.question}
                            >
                                <h3 className="text-xl tracking-[-0.04em]">
                                    {faq.question}
                                </h3>
                                <p className="mt-3 max-w-4xl text-pretty text-black/62 leading-7">
                                    {faq.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {relatedEntries.length > 0 ? (
                <section className="bg-[#F7F3EE] px-6 py-18 text-[#111111] md:px-10 md:py-24">
                    <div className="mx-auto w-full max-w-6xl">
                        <div className="max-w-2xl">
                            <p className="font-medium text-[0.72rem] text-black/45 uppercase tracking-[0.22em]">
                                Related pages
                            </p>
                            <h2 className="mt-4 text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                                More {category.shortLabel.toLowerCase()}{" "}
                                comparisons
                            </h2>
                        </div>
                        <div className="mt-12 grid gap-4 lg:grid-cols-2">
                            {relatedEntries.map((relatedEntry) => (
                                <Link
                                    className="group rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.05)] transition-all hover:-translate-y-0.5"
                                    href={`/versus/${relatedEntry.slug}`}
                                    key={relatedEntry.slug}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-medium text-[0.72rem] text-black/42 uppercase tracking-[0.2em]">
                                                Related comparison
                                            </p>
                                            <h3 className="mt-3 text-2xl tracking-[-0.04em]">
                                                Cache vs {relatedEntry.name}
                                            </h3>
                                            <p className="mt-3 text-pretty text-black/62 leading-7">
                                                {relatedEntry.tagline}
                                            </p>
                                        </div>
                                        <span className="text-black/30 transition-transform group-hover:translate-x-0.5">
                                            →
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            <section className="bg-white px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto flex w-full max-w-4xl flex-col items-center rounded-[2.5rem] border border-black/8 bg-[#FAF8F4] px-8 py-12 text-center shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:px-12">
                    <p className="font-medium text-[0.72rem] text-black/42 uppercase tracking-[0.22em]">
                        Final takeaway
                    </p>
                    <h2 className="mt-4 max-w-2xl text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                        Cache is for people who want saved things to become
                        useful.
                    </h2>
                    <p className="mt-5 max-w-2xl text-pretty text-black/62 leading-7">
                        If you mostly want {entry.name} for {entry.focus}, it
                        may be the right fit. If you want a unified library that
                        helps you find, organize, and operationalize what you
                        save across platforms, Cache is the sharper choice.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link
                            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 font-medium text-white transition-transform hover:-translate-y-0.5"
                            href="/"
                        >
                            Explore Cache
                        </Link>
                        <Link
                            className="inline-flex items-center justify-center rounded-full border border-black/12 px-5 py-3 font-medium text-black transition-colors hover:bg-black hover:text-white"
                            href="/versus"
                        >
                            Browse all comparisons
                        </Link>
                    </div>
                </div>
            </section>

            <div className="bg-white px-6 pb-8 text-[#111111] md:px-10">
                <div className="mx-auto w-full max-w-6xl">
                    <Footer />
                </div>
            </div>
        </PageShell>
    );
}

function buildFaqs(
    entry: NonNullable<ReturnType<typeof getVersusEntry>>,
    category: ReturnType<typeof getVersusCategory>
) {
    return [
        {
            answer: `Cache is more focused on unifying saved content from many platforms into one searchable library. ${entry.name} is more focused on ${entry.focus}.`,
            question: `What is the main difference between Cache App and ${entry.name}?`,
        },
        {
            answer: `Choose ${entry.name} if you mainly want a product for ${entry.bestFor}. Choose Cache if you want a broader saved-content workflow centered on search, organization, and later reuse.`,
            question: `Who should choose ${entry.name} instead of Cache?`,
        },
        {
            answer: `Cache overlaps with ${entry.name} because both sit near the ${category.label.toLowerCase()} space, but Cache is positioned around making saved knowledge retrievable and actionable across fragmented sources.`,
            question: `Is Cache App an alternative to ${entry.name}?`,
        },
    ];
}

function DecisionCard({
    eyebrow,
    items,
    title,
}: {
    eyebrow: string;
    items: string[];
    title: string;
}) {
    return (
        <div className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.05)]">
            <p className="font-medium text-[0.72rem] text-black/42 uppercase tracking-[0.2em]">
                {eyebrow}
            </p>
            <h3 className="mt-4 text-2xl tracking-[-0.04em]">{title}</h3>
            <div className="mt-5 grid gap-3">
                {items.map((item) => (
                    <div
                        className="rounded-[1.2rem] border border-black/8 bg-[#FAF8F4] px-4 py-4 text-black/68 text-sm leading-6"
                        key={item}
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
            <p className="text-[0.72rem] text-white/45 uppercase tracking-[0.18em]">
                {label}
            </p>
            <p className="mt-2 text-sm text-white/78 leading-6">{value}</p>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-4">
            <p className="text-[0.72rem] text-white/45 uppercase tracking-[0.18em]">
                {label}
            </p>
            <p className="mt-3 font-medium text-2xl tracking-[-0.05em]">
                {value}
            </p>
        </div>
    );
}
