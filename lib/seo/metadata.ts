import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import type { Metadata } from "next";
import "server-only";

interface BuildPageMetadataArgs {
    description: string;
    keywords?: string[];
    locale?: string;
    ogType?: "website" | "article";
    path: `/${string}`;
    title: string;
}

/**
 * Builds a standard Metadata object with alternates, Open Graph, and Twitter
 * card fields filled in. Callers provide page-specific title, description,
 * and optional keywords; common wiring (canonical URLs, card type, etc.) is
 * applied automatically.
 */
export function buildPageMetadata({
    description,
    keywords,
    ogType = "website",
    path,
    title,
}: BuildPageMetadataArgs): Metadata {
    return {
        alternates: buildLocaleAlternates(path),
        description,
        keywords,
        openGraph: {
            description,
            title,
            type: ogType,
        },
        title,
        twitter: {
            card: "summary_large_image",
            description,
            title,
        },
    };
}
