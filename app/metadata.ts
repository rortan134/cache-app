import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import { BASE_URL } from "@/lib/common/constants";
import type { Metadata } from "next";

interface BuildPageMetadataArgs {
    description: string;
    keywords?: string[];
    locale?: string;
    ogImage?: string;
    ogType?: "website" | "article";
    path: `/${string}`;
    title: string | { absolute: string };
}

const DEFAULT_OG_IMAGE = `${BASE_URL}/opengraph-image.png`;

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
    locale,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = "website",
    path,
    title,
}: BuildPageMetadataArgs): Metadata {
    return {
        alternates: buildLocaleAlternates(path),
        description,
        keywords,
        metadataBase: new URL(BASE_URL),
        openGraph: {
            description,
            images: [
                {
                    alt: "The word 'Cache' in bold abstract lettering on a warm off-white background",
                    height: 630,
                    url: ogImage,
                    width: 1200,
                },
            ],
            locale,
            title,
            type: ogType,
        },
        title,
        twitter: {
            card: "summary_large_image",
            description,
            images: [
                {
                    alt: "The word 'Cache' in bold abstract lettering on a warm off-white background",
                    height: 630,
                    url: ogImage,
                    width: 1200,
                },
            ],
            title,
        },
    };
}
