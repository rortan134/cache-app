declare module "highlight-words-core" {
    export interface HighlightWordsChunk {
        end: number;
        highlight: boolean;
        start: number;
    }

    export interface FindAllTextParams {
        autoEscape?: boolean;
        caseSensitive?: boolean;
        searchWords: string[];
        textToHighlight: string;
    }

    export function findAll(params: FindAllTextParams): HighlightWordsChunk[];
}
