import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";

interface ChangelogEntry {
    button?: {
        url: string;
        text: string;
    };
    date: string;
    description: string;
    image?: string;
    items?: string[];
    title: string;
    version: string;
}

const entries = [
    {
        button: {
            text: "Explore Cache",
            url: "/",
        },
        date: "9 April 2026",
        description:
            "Cache is officially live. This first release delivers the core experience for saving, organizing, and searching your personal knowledge library.",
        image: "https://cachd.app/opengraph-image.png",
        items: [
            "Unified bookmark import and management across multiple sources",
            "Fast library browsing with collection-based organization",
            "Actionable search to quickly find saved content",
            "Foundational sharing and workspace-ready collaboration flows",
        ],
        title: "Product launch",
        version: "Version 1.0.0",
    },
] satisfies ChangelogEntry[];

export default function ChangelogPage() {
    return (
        <section className="py-32">
            <div className="container">
                <div className="mx-auto max-w-3xl">
                    <h1 className="mb-4 font-bold text-3xl tracking-tight md:text-5xl">
                        Changelog
                    </h1>
                </div>
                <div className="mx-auto mt-16 max-w-3xl space-y-16 md:mt-24 md:space-y-24">
                    {entries.map((entry, index) => (
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
                                    <img
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
