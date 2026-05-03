import { changelogEntries } from "@/app/[locale]/changelog/data";
import { APP_NAME, BASE_URL } from "@/lib/common/constants";

const CACHE_CONTROL_HEADER = "public, max-age=3600";

/** Most recent entry date used as the feed's last build date. */
const lastBuildDate = changelogEntries
    .map((e) => new Date(e.date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

export function GET(): Response {
    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>${escapeXml(`${APP_NAME} Changelog`)}</title>
    <link>${BASE_URL}/changelog</link>
    <description>${escapeXml(`See what's new in ${APP_NAME}.`)}</description>
    <language>en-US</language>
    <lastBuildDate>${lastBuildDate?.toUTCString() ?? new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${changelogEntries
        .map(
            (entry) => `
    <item>
        <title>${escapeXml(entry.title)}</title>
        <link>${BASE_URL}/changelog</link>
        <guid>${BASE_URL}/changelog#${entry.version.replace(/\s/g, "-")}</guid>
        <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
        <description>${escapeXml(entry.description)}</description>
    </item>`
        )
        .join("")}
</channel>
</rss>`;

    return new Response(rss, {
        headers: {
            "Cache-Control": CACHE_CONTROL_HEADER,
            "Content-Type": "application/xml",
        },
    });
}

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
