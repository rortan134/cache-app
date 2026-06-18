import { createLogger } from "@/lib/common/logs/console/logger";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import { useEffect, useRef, useState } from "react";

const log = createLogger("use-autosave");

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
    content: string;
    delay?: number;
    enabled?: boolean;
    onSave: () => Promise<void>;
    savedContent: string;
}

interface UseAutosaveReturn {
    isDirty: boolean;
    saveImmediately: () => Promise<void>;
    saveStatus: SaveStatus;
}

const MIN_SAVING_DISPLAY_MS = 600;

/**
 * Shared autosave hook that debounces content changes and persists them automatically.
 * Keeps Cmd+S / Save button working via `saveImmediately`, and flushes on unmount
 * so edits aren't lost when navigating away.
 */
export function useAutosave({
    content,
    savedContent,
    onSave: onSaveProp,
    delay = 1500,
    enabled = true,
}: UseAutosaveOptions): UseAutosaveReturn {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const debounceTimeout = useTimeout();
    const idleTimeout = useTimeout();
    const onSave = useStableCallback(onSaveProp);
    const contentRef = useValueAsRef(content);
    const enabledRef = useValueAsRef(enabled);
    const savedContentRef = useValueAsRef(savedContent);

    const isSavingRef = useRef(false);
    const savingStartRef = useRef(0);

    const isDirty = content !== savedContent;

    const save = useStableCallback(async () => {
        if (
            !enabledRef.current ||
            isSavingRef.current ||
            contentRef.current === savedContentRef.current
        ) {
            return;
        }
        isSavingRef.current = true;
        savingStartRef.current = Date.now();
        setSaveStatus("saving");
        let nextStatus: SaveStatus = "saved";
        try {
            await onSave();
        } catch (error) {
            log.error("Save failed", error);
            nextStatus = "error";
        } finally {
            const elapsed = Date.now() - savingStartRef.current;
            const remaining = Math.max(0, MIN_SAVING_DISPLAY_MS - elapsed);
            idleTimeout.start(remaining, () => {
                setSaveStatus(nextStatus);
                isSavingRef.current = false;
                if (
                    nextStatus !== "error" &&
                    contentRef.current !== savedContentRef.current
                ) {
                    save();
                } else {
                    idleTimeout.start(2000, () => setSaveStatus("idle"));
                }
            });
        }
    });

    useEffect(() => {
        if (!(enabled && isDirty) || isSavingRef.current) {
            return;
        }
        debounceTimeout.start(delay, save);
        return () => debounceTimeout.clear();
    }, [enabled, isDirty, delay, save, debounceTimeout]);

    useEffect(
        () => () => {
            if (
                enabledRef.current &&
                contentRef.current !== savedContentRef.current &&
                !isSavingRef.current
            ) {
                onSave().catch((error) => {
                    log.error("Unmount autosave failed", error);
                });
            }
        },
        [contentRef, enabledRef, onSave, savedContentRef]
    );

    const saveImmediately = useStableCallback(async () => {
        debounceTimeout.clear();
        await save();
    });

    return { isDirty, saveImmediately, saveStatus };
}
