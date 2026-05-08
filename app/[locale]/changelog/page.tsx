import { changelogEntries } from "@/app/[locale]/changelog/data";
import { JsonLdScript } from "@/app/json-ld-script";
import { buildPageMetadata } from "@/app/metadata";
import { Badge } from "@/components/ui/badge";
import { BASE_URL } from "@/lib/common/constants";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return buildPageMetadata({
        description: gtPublicString(
            locale,
            "changelog.metadata.description",
            "Release Notes — See what's new in Cache App."
        ),
        keywords: ["changelog", "product updates", "Cache App releases"],
        locale,
        path: "/changelog",
        title: gtPublicString(locale, "changelog.metadata.title", "Changelog"),
    });
}

export default function ChangelogPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: changelogEntries.map((entry, index) => ({
            "@type": "ListItem",
            item: {
                "@type": "TechArticle",
                datePublished: new Date(entry.date).toISOString(),
                description: entry.description,
                headline: entry.title,
                image: entry.image ? `${BASE_URL}${entry.image}` : undefined,
                url: `${BASE_URL}/changelog`,
            },
            position: index + 1,
        })),
    };

    return (
        <section className="py-32">
            <JsonLdScript data={jsonLd} />
            <div className="container">
                <div className="mx-auto max-w-3xl">
                    <h1 className="mb-4 font-bold text-3xl tracking-tight md:text-5xl">
                        Changelog
                    </h1>
                </div>
                <div className="mx-auto mt-16 max-w-3xl space-y-16 md:mt-24 md:space-y-24">
                    {changelogEntries.map((entry, index) => (
                        <div
                            className="relative flex flex-col gap-4 md:flex-row md:gap-16"
                            key={index}
                        >
                            <div className="top-8 flex h-min w-64 shrink-0 items-center gap-4 md:sticky">
                                <Badge className="text-xs" variant="secondary">
                                    {entry.version}
                                </Badge>
                                <span className="font-medium text-muted-foreground text-xs">
                                    {entry.date}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="mb-3 font-bold text-foreground/90 text-lg leading-tight md:text-2xl">
                                    {entry.title}
                                </h2>
                                <p className="text-muted-foreground text-sm md:text-base">
                                    {entry.description}
                                </p>
                                {entry.items && entry.items.length > 0 && (
                                    <ul className="mt-4 ml-4 space-y-1.5 text-muted-foreground text-sm md:text-base">
                                        {entry.items.map((item, itemIndex) => (
                                            <li
                                                className="list-disc"
                                                key={itemIndex}
                                            >
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {entry.image && (
                                    <Image
                                        alt={`${entry.version} visual`}
                                        className="mt-8 w-full rounded-lg object-cover"
                                        height={675}
                                        src={entry.image}
                                        width={1200}
                                    />
                                )}
                                {entry.button && (
                                    <a
                                        className="mt-4 self-end"
                                        href={entry.button.url}
                                    >
                                        {entry.button.text}{" "}
                                        <ArrowUpRight className="inline h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
