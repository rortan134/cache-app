-- Enforce that the denormalized note content projections are paired:
-- a row is either a note (both html and text set) or not a note (both null).
-- The text projection is derived from the html projection by
-- `extractNoteText(sanitizeNoteHtml(html))` in
-- `lib/integrations/notes/service.ts`; that functional dependency is not
-- representable as a CHECK constraint, so we only enforce the structural
-- pair invariant here and rely on the single write path
-- (`createNote`/`updateNote`/`createNoteFromPlainText`) for the rest.

UPDATE "library_item"
SET
    "noteContentHtml" = NULL,
    "noteContentText" = NULL
WHERE
    ("noteContentHtml" IS NULL) <> ("noteContentText" IS NULL);

ALTER TABLE "library_item"
ADD CONSTRAINT "library_item_note_content_pair_check"
CHECK (
    ("noteContentHtml" IS NULL AND "noteContentText" IS NULL)
    OR ("noteContentHtml" IS NOT NULL AND "noteContentText" IS NOT NULL)
);
