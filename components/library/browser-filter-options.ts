import type { LibraryItemSource } from "@/prisma/client/enums";

export type BrowserCollectionMembershipFilter =
    | "all"
    | "in-collections"
    | "not-in-collections";

export interface BrowserRelatedFilterState {
    collectionMembershipFilter: BrowserCollectionMembershipFilter;
    domainFilters: string[];
    searchTerms: string[];
    selectedCollectionIds: string[];
    sourceFilters: LibraryItemSource[];
}

export interface BrowserRelatedFilterOptions {
    domain: string;
    source: LibraryItemSource;
}

export function mergeRelatedBrowserFilterOptions(
    state: BrowserRelatedFilterState,
    options: BrowserRelatedFilterOptions
): BrowserRelatedFilterState {
    return {
        ...state,
        domainFilters: appendUniqueFilterOption(
            state.domainFilters,
            options.domain
        ),
        sourceFilters: appendUniqueFilterOption(
            state.sourceFilters,
            options.source
        ),
    };
}

function appendUniqueFilterOption<T>(values: T[], value: T): T[] {
    return values.includes(value) ? values : [...values, value];
}
