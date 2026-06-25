export default async function getLocale(): Promise<string> {
    try {
        // Dynamic import avoids compile-time static export checks on routes
        // (like sitemap.ts) that do not have a [locale] root parameter.
        const { locale } = await import("next/root-params");
        return await locale();
    } catch {
        return "en-US";
    }
}
