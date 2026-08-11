"use client";

import { Textarea } from "@/components/ui/textarea";
import { useAutosave } from "@/hooks/use-autosave";
import type { LibraryItemWithCollections } from "@/lib/collections/utils";
import {
    getLibraryItemComment,
    updateLibraryItemComment,
} from "@/lib/comments/actions";
import {
    COMMENT_TEXT_MAX_LENGTH,
    normalizeCommentText,
} from "@/lib/comments/utils";
import { ACTION_STATUS } from "@/lib/common/constants";
import { stopPropagationForMenuTextInputKeys } from "@/lib/common/dom";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import { T, useGT } from "gt-next";
import * as React from "react";
import useSWR from "swr";

const COMMENT_SWR_KEY_PREFIX = "library-item-comment";

interface CommentActionPayload {
    contentText: string | null;
}

function getCommentSWRKey(libraryItemId: string, open: boolean) {
    return open ? [COMMENT_SWR_KEY_PREFIX, libraryItemId] : null;
}

async function fetchLibraryItemComment([
    _commentSwrKeyPrefix,
    libraryItemId,
]: readonly [string, string]): Promise<CommentActionPayload> {
    const result = await getLibraryItemComment(libraryItemId);
    if (result.status !== ACTION_STATUS.SUCCESS) {
        throw new Error(result.message);
    }
    return { contentText: result.contentText };
}

interface CommentTextareaProps {
    item: LibraryItemWithCollections;
    open: boolean;
}

/**
 * Single-comment editor for a library item. Rendered inside the card's menu
 * surfaces; the comment is fetched on demand (only while a surface is open)
 * and autosaved through `useAutosave`, which also flushes on unmount so a
 * popup closing mid-edit still persists.
 */
export function CommentTextarea({ item, open }: CommentTextareaProps) {
    const gt = useGT();
    const { data, error, isLoading, mutate } = useSWR(
        getCommentSWRKey(item.id, open),
        fetchLibraryItemComment,
        { keepPreviousData: true }
    );

    // Once armed (first opened with the menu), stay armed until unmount so the
    // autosave flush fires when the popup closes. Without this latch, `open`
    // flips false in the render that precedes unmount, `enabled` follows, and
    // edits made right before closing would be dropped.
    const [hasOpened, setHasOpened] = React.useState(false);
    if (open && !hasOpened) {
        setHasOpened(true);
    }

    const savedContent = data?.contentText ?? "";
    const [content, setContent] = React.useState(savedContent);
    const contentRef = useValueAsRef(content);
    const hasUserEditedRef = React.useRef(false);

    // When the fetched comment lands (or a save round-trips), replace the
    // draft unless the user is mid-edit. Mirrors the note editor's
    // "preserve local draft" guard.
    const [prevSavedContent, setPrevSavedContent] =
        React.useState(savedContent);
    if (prevSavedContent !== savedContent) {
        setPrevSavedContent(savedContent);
        if (!hasUserEditedRef.current) {
            setContent(savedContent);
        }
    }

    const handleSave = useStableCallback(async () => {
        const next = normalizeCommentText(contentRef.current) ?? "";
        const result = await updateLibraryItemComment({
            contentText: next,
            libraryItemId: item.id,
        });
        if (result.status !== ACTION_STATUS.SUCCESS) {
            return false;
        }
        await mutate({ contentText: result.contentText });
        // Clear the mid-edit latch only after the round-trip lands; clearing it
        // before `mutate` would let the draft guard overwrite keystrokes typed
        // while the save was in flight.
        hasUserEditedRef.current = false;
        return true;
    });

    const handleChange = useStableCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            hasUserEditedRef.current = true;
            setContent(event.currentTarget.value);
        }
    );

    const { saveStatus } = useAutosave({
        content,
        enabled: hasOpened && !isLoading,
        onSave: handleSave,
        savedContent,
    });

    if (error && data === undefined) {
        return (
            <div className="flex h-20 min-h-16 items-center rounded-lg bg-muted px-2.5 py-2 text-muted-foreground text-xs">
                <T>Comment unavailable</T>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <Textarea
                aria-label={gt("Comment on this item")}
                className="my-0.5 border-none"
                disabled={isLoading}
                maxLength={COMMENT_TEXT_MAX_LENGTH}
                onChange={handleChange}
                onKeyDown={stopPropagationForMenuTextInputKeys}
                placeholder={gt("Add a comment...")}
                rows={4}
                size="sm"
                value={content}
            />
            {saveStatus === "error" && (
                <p aria-live="polite" className="text-destructive text-xs">
                    <T>Not saved</T>
                </p>
            )}
        </div>
    );
}
