import { describe, expect, test } from "bun:test";
import { LibraryItemSource } from "@/prisma/client/enums";
import {
    ASK_CACHE_CONTEXT_COLLECTION_LIMIT,
    ASK_CACHE_PROMPT_MAX_LENGTH,
    AskCacheComposerPatchSchema,
    AskCacheRequestSchema,
} from "./ask-cache";

function buildValidAskCacheRequest() {
    return {
        composerState: {
            collectionMembershipFilter: "all",
            columnCountMode: "auto",
            domainFilters: [],
            groupBy: "none",
            layoutMode: "masonry",
            searchTerms: ["design systems"],
            selectedCollectionIds: [],
            sortMode: "added-newest",
            sourceFilters: [LibraryItemSource.cache_note],
        },
        prompt: "show notes about design systems",
        visibleContext: {
            availableCollections: [
                {
                    id: "collection_1",
                    itemCount: 3,
                    name: "Design",
                },
            ],
            availableDomains: ["example.com"],
            filteredItemCount: 12,
            totalItemCount: 20,
        },
    };
}

describe("Ask Cache schemas", () => {
    test("accepts the browser composer state contract", () => {
        expect(
            AskCacheRequestSchema.safeParse(buildValidAskCacheRequest()).success
        ).toBe(true);
    });

    test("rejects unsupported composer modes", () => {
        const validRequest = buildValidAskCacheRequest();
        const request = {
            ...validRequest,
            composerState: {
                ...validRequest.composerState,
                groupBy: "week",
            },
        };

        expect(AskCacheRequestSchema.safeParse(request).success).toBe(false);
    });

    test("rejects overlong prompts", () => {
        const request = buildValidAskCacheRequest();
        request.prompt = "x".repeat(ASK_CACHE_PROMPT_MAX_LENGTH + 1);

        expect(AskCacheRequestSchema.safeParse(request).success).toBe(false);
    });

    test("rejects arbitrary patch fields", () => {
        expect(
            AskCacheComposerPatchSchema.safeParse({
                searchTerms: ["recipes"],
                unsafeCommand: "delete everything",
            }).success
        ).toBe(false);
    });

    test("rejects empty composer patches", () => {
        expect(AskCacheComposerPatchSchema.safeParse({}).success).toBe(false);
    });

    test("accepts intentional empty-array composer patches", () => {
        expect(
            AskCacheComposerPatchSchema.safeParse({
                selectedCollectionIds: [],
            }).success
        ).toBe(true);
    });

    test("rejects over-limit visible collection context", () => {
        const request = buildValidAskCacheRequest();
        request.visibleContext.availableCollections = Array.from(
            { length: ASK_CACHE_CONTEXT_COLLECTION_LIMIT + 1 },
            (_, index) => ({
                id: `collection_${index}`,
                itemCount: 1,
                name: `Collection ${index}`,
            })
        );

        expect(AskCacheRequestSchema.safeParse(request).success).toBe(false);
    });
});
