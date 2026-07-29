/**
 * Load translations from local files (public/_gt/[locale].json).
 * @see https://generaltranslation.com/docs/next/guides/local-tx
 */
export default async function loadTranslations(locale: string) {
    const translations = await import(`./public/_gt/${locale}.json`);
    return translations.default;
}
