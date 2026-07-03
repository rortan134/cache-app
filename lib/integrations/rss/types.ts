export interface Feed {
    createdAt: Date;
    description: string | null;
    feedUrl: string;
    id: string;
    lastError: string | null;
    lastFetchedAt: Date | null;
    siteUrl: string | null;
    title: string | null;
    updatedAt: Date;
}
