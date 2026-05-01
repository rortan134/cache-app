import { Footer } from "@/components/ui/footer";
import { PageShell } from "@/components/ui/page-shell";
import { BASE_URL } from "@/lib/common/constants";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
    getEntriesByCategory,
    versusCategories,
    versusEntries,
    versusEntryCount,
} from "./data";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    const title = "Cache App vs alternatives";
    const description =
        "Compare Cache App with AI bookmark managers, read-it-later apps, visual curation tools, traditional bookmark managers, and PKM tools.";

    return buildPageMetadata({
        description,
        keywords: [
            "Cache App alternatives",
            "Cache App competitors",
            "bookmark manager comparison",
            "read-it-later alternatives",
            "PKM alternatives",
        ],
        locale,
        path: "/versus",
        title,
    });
}

function buildItemListJsonLd() {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: versusEntries.map((entry, index) => ({
            "@type": "ListItem",
            name: `Cache App vs ${entry.name}`,
            position: index + 1,
            url: `${BASE_URL}/versus/${entry.slug}`,
        })),
        name: "Cache App comparison pages",
    };
}

export default function VersusIndexPage() {
    const itemListJsonLd = buildItemListJsonLd();

    return (
        <PageShell className="bg-[#111111] text-white">
            <script type="application/ld+json">
                {JSON.stringify(itemListJsonLd)}
            </script>

            <section className="border-white/8 border-b px-6 pt-10 pb-16 md:px-10 md:pt-14 md:pb-24">
                <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center">
                    <div className="max-w-2xl">
                        <span className="inline-flex rounded-full border border-white/12 bg-white/6 px-3 py-1 font-medium text-[0.7rem] text-white/72 uppercase tracking-[0.22em]">
                            Comparison hub
                        </span>
                        <h1 className="mt-6 text-balance font-medium text-4xl leading-[0.92] tracking-[-0.06em] md:text-6xl">
                            Better than scattered saves:
                            <br />
                            Compare Cache with the rest.
                        </h1>
                        <p className="mt-5 max-w-xl text-pretty text-[1.02rem] text-white/68 leading-7">
                            Explore {versusEntryCount} data-driven comparison
                            pages across AI bookmark managers, read-it-later
                            tools, traditional bookmarking apps, visual curation
                            products, and second-brain platforms.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                className="inline-flex items-center justify-center rounded-full bg-[#F2FF3A] px-5 py-3 font-medium text-[#111111] transition-transform hover:-translate-y-0.5"
                                href="/pricing"
                            >
                                See pricing
                            </Link>
                            <Link
                                className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/4 px-5 py-3 font-medium text-white transition-colors hover:bg-white/8"
                                href="/"
                            >
                                Learn about Cache
                            </Link>
                        </div>
                        <div className="mt-10 grid gap-3 sm:grid-cols-3">
                            <StatCard
                                label="Comparison pages"
                                value={`${versusEntryCount}`}
                            />
                            <StatCard
                                label="Product categories"
                                value={`${versusCategories.length}`}
                            />
                            <StatCard
                                label="Core promise"
                                value="1 unified library"
                            />
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] text-white/55 uppercase tracking-[0.18em]">
                                    Why these pages exist
                                </span>
                                <span className="text-[0.7rem] text-white/42 uppercase tracking-[0.18em]">
                                    SEO + buyer research
                                </span>
                            </div>
                            <div className="mt-5 grid gap-3">
                                <PreviewLine
                                    label="Search intent"
                                    value="Cache vs mymind"
                                />
                                <PreviewLine
                                    label="Alternative intent"
                                    value="best read it later alternative"
                                />
                                <PreviewLine
                                    label="Category intent"
                                    value="bookmark manager vs PKM"
                                />
                            </div>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <PreviewPanel
                                    eyebrow="Cache"
                                    text="Built for unifying what you save across platforms, then making it searchable, organized, and useful."
                                />
                                <PreviewPanel
                                    eyebrow="Alternatives"
                                    text="Strong at AI capture, reading, boards, note systems, or traditional bookmarking depth."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-[#F7F3EE] px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
                        <div>
                            <p className="font-medium text-[0.72rem] text-black/45 uppercase tracking-[0.22em]">
                                Category map
                            </p>
                            <h2 className="mt-4 max-w-xl text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                                See how Cache stacks up by category
                            </h2>
                        </div>
                        <p className="max-w-2xl text-pretty text-[0.98rem] text-black/62 leading-7">
                            Cache overlaps several product markets. These pages
                            help people compare the job-to-be-done more clearly:
                            unified saved-content retrieval versus reading
                            queues, classic bookmarking, inspiration boards, or
                            full PKM systems.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-4 lg:grid-cols-2">
                        {versusCategories.map((category) => (
                            <div
                                className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.05)]"
                                key={category.id}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-[0.72rem] text-black/42 uppercase tracking-[0.2em]">
                                            {category.shortLabel}
                                        </p>
                                        <h3 className="mt-2 text-2xl tracking-[-0.04em]">
                                            {category.label}
                                        </h3>
                                    </div>
                                    <span className="rounded-full bg-black px-3 py-1 text-[0.72rem] text-white">
                                        {
                                            getEntriesByCategory(category.id)
                                                .length
                                        }{" "}
                                        pages
                                    </span>
                                </div>
                                <p className="mt-4 max-w-2xl text-pretty text-black/62 leading-7">
                                    {category.description}
                                </p>
                                <div className="mt-6 flex flex-wrap gap-2">
                                    {getEntriesByCategory(category.id)
                                        .slice(0, 5)
                                        .map((entry) => (
                                            <Link
                                                className="rounded-full border border-black/10 bg-[#F7F3EE] px-3 py-1.5 text-sm transition-colors hover:bg-black hover:text-white"
                                                href={`/versus/${entry.slug}`}
                                                key={entry.slug}
                                            >
                                                Cache vs {entry.name}
                                            </Link>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-white px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto w-full max-w-6xl">
                    <div className="max-w-2xl">
                        <p className="font-medium text-[0.72rem] text-black/45 uppercase tracking-[0.22em]">
                            All comparisons
                        </p>
                        <h2 className="mt-4 text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                            Browse every Cache comparison page
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-10 lg:grid-cols-3">
                        {versusCategories.map((category) => (
                            <div key={category.id}>
                                <h3 className="text-xl tracking-[-0.04em]">
                                    {category.label}
                                </h3>
                                <div className="mt-5 grid gap-3">
                                    {getEntriesByCategory(category.id).map(
                                        (entry) => (
                                            <Link
                                                className="group rounded-[1.4rem] border border-black/10 bg-[#FAF8F4] px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-black/18 hover:bg-white"
                                                href={`/versus/${entry.slug}`}
                                                key={entry.slug}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-medium tracking-[-0.03em]">
                                                            Cache vs{" "}
                                                            {entry.name}
                                                        </p>
                                                        <p className="mt-2 text-pretty text-black/60 text-sm leading-6">
                                                            {entry.tagline}
                                                        </p>
                                                    </div>
                                                    <span className="text-black/30 transition-transform group-hover:translate-x-0.5">
                                                        →
                                                    </span>
                                                </div>
                                            </Link>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#F7F3EE] px-6 py-18 text-[#111111] md:px-10 md:py-24">
                <div className="mx-auto flex w-full max-w-4xl flex-col items-center rounded-[2.5rem] border border-black/8 bg-white px-8 py-12 text-center shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:px-12">
                    <p className="font-medium text-[0.72rem] text-black/42 uppercase tracking-[0.22em]">
                        Core positioning
                    </p>
                    <h2 className="mt-4 max-w-2xl text-balance font-medium text-3xl leading-[0.96] tracking-[-0.05em] md:text-5xl">
                        Cache starts where the algorithmic feed ends.
                    </h2>
                    <p className="mt-5 max-w-2xl text-pretty text-black/62 leading-7">
                        Every comparison page explains the same product truth
                        from a different angle: Cache is for people who want the
                        things they save to become searchable, organized, and
                        useful when they actually matter.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link
                            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 font-medium text-white transition-transform hover:-translate-y-0.5"
                            href="/"
                        >
                            Explore the product
                        </Link>
                        <Link
                            className="inline-flex items-center justify-center rounded-full border border-black/12 px-5 py-3 font-medium text-black transition-colors hover:bg-black hover:text-white"
                            href="/pricing"
                        >
                            See plans
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

function PreviewLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
            <span className="text-[0.72rem] text-white/45 uppercase tracking-[0.18em]">
                {label}
            </span>
            <span className="font-medium text-sm text-white/86">{value}</span>
        </div>
    );
}

function PreviewPanel({ eyebrow, text }: { eyebrow: string; text: string }) {
    return (
        <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-[0.72rem] text-white/45 uppercase tracking-[0.2em]">
                {eyebrow}
            </p>
            <p className="mt-3 text-sm text-white/72 leading-6">{text}</p>
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
