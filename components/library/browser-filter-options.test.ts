import { describe, expect, test } from "bun:test";
import { mergeRelatedBrowserFilterOptions } from "@/components/library/browser-filter-options";
import { LibraryItemSource } from "@/prisma/client/enums";

describe("mergeRelatedBrowserFilterOptions", () => {
    test("adds missing source and domain filters", () => {
        const result = mergeRelatedBrowserFilterOptions(
            {
                collectionMembershipFilter: "all",
                domainFilters: [],
                searchTerms: [],
                selectedCollectionIds: [],
                sourceFilters: [],
            },
            {
                domain: "example.com",
                source: LibraryItemSource.chrome_bookmarks,
            }
        );

        expect(result.sourceFilters).toEqual([
            LibraryItemSource.chrome_bookmarks,
        ]);
        expect(result.domainFilters).toEqual(["example.com"]);
    });

    test("does not duplicate existing source and domain filters", () => {
        const result = mergeRelatedBrowserFilterOptions(
            {
                collectionMembershipFilter: "all",
                domainFilters: ["example.com"],
                searchTerms: [],
                selectedCollectionIds: [],
                sourceFilters: [LibraryItemSource.chrome_bookmarks],
            },
            {
                domain: "example.com",
                source: LibraryItemSource.chrome_bookmarks,
            }
        );

        expect(result.sourceFilters).toEqual([
            LibraryItemSource.chrome_bookmarks,
        ]);
        expect(result.domainFilters).toEqual(["example.com"]);
    });

    test("preserves unrelated filters", () => {
        const result = mergeRelatedBrowserFilterOptions(
            {
                collectionMembershipFilter: "in-collections",
                domainFilters: ["initial.com"],
                searchTerms: ["design systems"],
                selectedCollectionIds: ["collection-a"],
                sourceFilters: [LibraryItemSource.github_starred_repositories],
            },
            {
                domain: "example.com",
                source: LibraryItemSource.chrome_bookmarks,
            }
        );

        expect(result).toEqual({
            collectionMembershipFilter: "in-collections",
            domainFilters: ["initial.com", "example.com"],
            searchTerms: ["design systems"],
            selectedCollectionIds: ["collection-a"],
            sourceFilters: [
                LibraryItemSource.github_starred_repositories,
                LibraryItemSource.chrome_bookmarks,
            ],
        });
    });

    test("does not add collection filters", () => {
        const result = mergeRelatedBrowserFilterOptions(
            {
                collectionMembershipFilter: "not-in-collections",
                domainFilters: [],
                searchTerms: [],
                selectedCollectionIds: ["existing-collection"],
                sourceFilters: [],
            },
            {
                domain: "example.com",
                source: LibraryItemSource.chrome_bookmarks,
            }
        );

        expect(result.collectionMembershipFilter).toBe("not-in-collections");
        expect(result.selectedCollectionIds).toEqual(["existing-collection"]);
    });
});
