export interface ExtensionCollectionDto {
    id: string;
    itemCount: number;
    name: string;
    priority: string;
}

export interface ExtensionClipUserDto {
    email: string;
    image: string | null;
    name: string | null;
}

export interface ListCollectionsResponse {
    collections: ExtensionCollectionDto[];
    ok: true;
    user: ExtensionClipUserDto;
}

export interface CreateCollectionResponse {
    collection: ExtensionCollectionDto;
    ok: true;
}

export interface ClipResponse {
    collectionIds: string[];
    created: boolean;
    itemId: string;
    ok: true;
}
