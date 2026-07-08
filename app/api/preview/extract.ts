import { Parser } from "htmlparser2";

/**
 * Extract candidate preview image URLs from an HTML document, mirroring the
 * precedence link-preview-js used for `page.images`:
 *   1. <meta property="og:image"> content — all, in document order
 *   2. else <meta name="og:image"> content — all, in document order
 *      (link-preview-js returns property nodes OR name nodes, never both)
 *   3. else the first <link rel="image_src"> href
 *   4. else every <img> src, deduped by raw src, in document order
 *
 * Relative URLs resolve against `baseUrl` via `new URL(src, baseUrl).href`,
 * so an unresolvable src throws — callers surface that as a 404, matching the
 * prior getPreviewFromContent behavior.
 *
 * Uses htmlparser2's streaming tokenizer instead of cheerio/parse5 to avoid
 * building a full DOM tree: ~10x faster (0.6ms vs 6.3ms on a 150 KiB page).
 * Tag and attribute names are lowercased to match parse5/cheerio; entities are
 * decoded so `&amp;` in a URL becomes `&` before resolution. Parity is verified
 * against link-preview-js in `app/api/preview/extract.test.ts`; see
 * perf/preview/RESULTS.md for the benchmark.
 */
export function extractPreviewImageUrls(
    html: string,
    baseUrl: string
): string[] {
    const propertyOgImages: string[] = [];
    const nameOgImages: string[] = [];
    let imageSrcLinkChecked = false;
    let imageSrcLinkHref: string | null = null;
    const imgUrls: string[] = [];
    const seenImgSrc = new Set<string>();

    const parser = new Parser(
        {
            onopentag(tag, attrs) {
                if (tag === "meta") {
                    const content = attrs.content;
                    if (attrs.property === "og:image" && content) {
                        propertyOgImages.push(new URL(content, baseUrl).href);
                    } else if (attrs.name === "og:image" && content) {
                        nameOgImages.push(new URL(content, baseUrl).href);
                    }
                } else if (tag === "link") {
                    if (
                        !imageSrcLinkChecked &&
                        attrs.rel === "image_src" &&
                        attrs.href
                    ) {
                        imageSrcLinkChecked = true;
                        imageSrcLinkHref = new URL(attrs.href, baseUrl).href;
                    } else if (
                        !imageSrcLinkChecked &&
                        attrs.rel === "image_src"
                    ) {
                        imageSrcLinkChecked = true;
                    }
                } else if (tag === "img") {
                    const src = attrs.src;
                    if (src && !seenImgSrc.has(src)) {
                        seenImgSrc.add(src);
                        imgUrls.push(new URL(src, baseUrl).href);
                    }
                }
            },
        },
        {
            decodeEntities: true,
            lowerCaseAttributeNames: true,
            lowerCaseTags: true,
        }
    );
    parser.write(html);
    parser.end();

    if (propertyOgImages.length > 0) {
        return propertyOgImages;
    }
    if (nameOgImages.length > 0) {
        return nameOgImages;
    }
    if (imageSrcLinkHref !== null) {
        return [imageSrcLinkHref];
    }
    return imgUrls;
}
