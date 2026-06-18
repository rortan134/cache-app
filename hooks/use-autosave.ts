import { createLogger } from "@/lib/common/logs/console/logger";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import { usePreventWindowUnload } from "@/hooks/use-prevent-unload";
import { useEffect, useRef, useState } from "react";

const log = createLogger("use-autosave");
const MIN_SAVING_DISPLAY_MS = 600;
const SAVE_STATUS_IDLE_DELAY_MS = 2000;

export type SaveStatus = "idle" | "saving" | "saved" | "error";
type SaveResult = boolean | string | undefined;

interface UseAutosaveOptions {
    content: string;
    delay?: number;
    enabled?: boolean;
    onSave: () => Promise<SaveResult> | SaveResult;
    savedContent: string;
}

interface UseAutosaveReturn {
    isDirty: boolean;
    saveImmediately: () => Promise<boolean>;
    saveStatus: SaveStatus;
}

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

    const activeSaveRef = useRef<Promise<boolean> | null>(null);
    const isMountedRef = useRef(false);
    const latestContentChangeMsRef = useRef(Date.now());
    const previousContentRef = useRef(content);
    const savingStartMsRef = useRef(0);

    const isDirty = content !== savedContent;

    if (content !== previousContentRef.current) {
        previousContentRef.current = content;
        latestContentChangeMsRef.current = Date.now();
    }

    const isDirtyRef = useValueAsRef(isDirty);

    const shouldPreventUnload = useStableCallback(
        () => activeSaveRef.current !== null || isDirtyRef.current
    );

    usePreventWindowUnload(shouldPreventUnload);

    const scheduleSettledStatus = useStableCallback(
        (nextStatus: SaveStatus) => {
            if (!isMountedRef.current) {
                return;
            }

            const elapsedMs = Date.now() - savingStartMsRef.current;
            const remainingMs = Math.max(0, MIN_SAVING_DISPLAY_MS - elapsedMs);

            idleTimeout.start(remainingMs, () => {
                setSaveStatus(nextStatus);
                idleTimeout.start(SAVE_STATUS_IDLE_DELAY_MS, () => {
                    setSaveStatus("idle");
                });
            });
        }
    );

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const save = useStableCallback(
        (shouldFlushQueued = false): Promise<boolean> => {
            if (!enabledRef.current) {
                return Promise.resolve(true);
            }

            const contentToSave = contentRef.current;
            if (
                !shouldFlushQueued &&
                contentToSave === savedContentRef.current
            ) {
                return Promise.resolve(true);
            }

            if (activeSaveRef.current) {
                if (!shouldFlushQueued) {
                    return activeSaveRef.current;
                }

                return activeSaveRef.current.then((didSave) => {
                    if (!didSave) {
                        return false;
                    }

                    return save(true);
                });
            }

            if (isMountedRef.current) {
                idleTimeout.clear();
                savingStartMsRef.current = Date.now();
                setSaveStatus("saving");
            }

            const savePromise = (async () => {
                let didSave = false;
                try {
                    const result = await onSave();
                    didSave = result !== false;
                    if (didSave) {
                        savedContentRef.current =
                            typeof result === "string" ? result : contentToSave;
                    }
                } catch (error) {
                    log.error("Save failed", error);
                }

                activeSaveRef.current = null;
                scheduleSettledStatus(didSave ? "saved" : "error");

                if (
                    didSave &&
                    enabledRef.current &&
                    contentRef.current !== savedContentRef.current
                ) {
                    if (shouldFlushQueued) {
                        return save(true);
                    }

                    const elapsedSinceChangeMs =
                        Date.now() - latestContentChangeMsRef.current;
                    const remainingCooldownMs = Math.max(
                        0,
                        delay - elapsedSinceChangeMs
                    );

                    debounceTimeout.start(remainingCooldownMs, () => {
                        save().catch((error: unknown) => {
                            log.error("Queued autosave failed", error);
                        });
                    });
                }

                return didSave;
            })();

            activeSaveRef.current = savePromise;
            return savePromise;
        }
    );

    useEffect(() => {
        if (!(enabled && isDirty) || activeSaveRef.current) {
            return;
        }
        debounceTimeout.start(delay, save);
        return () => debounceTimeout.clear();
    }, [enabled, isDirty, delay, save, debounceTimeout]);

    useEffect(
        () => () => {
            if (
                enabledRef.current &&
                contentRef.current !== savedContentRef.current
            ) {
                save(true).catch((error: unknown) => {
                    log.error("Unmount autosave failed", error);
                });
            }
        },
        [contentRef, enabledRef, save, savedContentRef]
    );

    const saveImmediately = useStableCallback(async () => {
        debounceTimeout.clear();
        return await save(true);
    });

    return { isDirty, saveImmediately, saveStatus };
}
