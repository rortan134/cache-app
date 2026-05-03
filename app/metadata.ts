import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import type { Metadata } from "next";

interface BuildPageMetadataArgs {
    description: string;
    keywords?: string[];
    locale?: string;
    ogImage?: string;
    ogType?: "website" | "article";
    path: `/${string}`;
    title: string;
}

const DEFAULT_OG_IMAGE = "/opengraph-image.png";

/**
 * Builds a standard Metadata object with alternates, Open Graph, and Twitter
 * card fields filled in. Callers provide page-specific title, description,
 * and optional keywords; common wiring (canonical URLs, card type, etc.) is
 * applied automatically.
 *
 * A default OG image is included so every page has a social preview. Callers
 * can override with a page-specific image via `ogImage`.
 */
export function buildPageMetadata({
    description,
    keywords,
    ogImage = DEFAULT_OG_IMAGE,
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
            images: [{ url: ogImage }],
            title,
            type: ogType,
        },
        title,
        twitter: {
            card: "summary_large_image",
            description,
            images: [{ url: ogImage }],
            title,
        },
    };
}
