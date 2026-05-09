"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/common/cn";
import { createFeedback } from "@/lib/feedback/actions";
import type { FeedbackActionState } from "@/lib/feedback/schema";
import { Send } from "lucide-react";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";

const initialFeedbackActionState: FeedbackActionState = {
    message: "",
    status: "idle",
} satisfies FeedbackActionState;

export function FeedbackWidget(
    props: React.ComponentProps<typeof PopoverTrigger> & { context?: string }
) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [state, formAction] = useActionState(
        createFeedback,
        initialFeedbackActionState
    );
    const formRef = useRef<HTMLFormElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(
        function closeOnSubmit() {
            if (state.status !== "success") {
                return;
            }
            const rect = submitButtonRef.current?.getBoundingClientRect();
            if (rect) {
                import(/* webpackIgnore: true */ "react-confetti-burst").then(
                    ({ createConfettiExplosion }) => {
                        createConfettiExplosion({
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2,
                        });
                    }
                );
            }
            formRef.current?.reset();
            setIsOpen(false);
        },
        [state.status]
    );

    useHotkeys("F", () => {
        setIsOpen((prev) => !prev);
    });

    return (
        <Popover onOpenChange={setIsOpen} open={isOpen}>
            <PopoverTrigger {...props} />
            <PopoverPopup className="*:p-2">
                <div className="space-y-3">
                    <form
                        action={formAction}
                        className="space-y-4"
                        ref={formRef}
                    >
                        <input name="pagePath" type="hidden" value={pathname} />
                        <label className="sr-only" htmlFor="feedback-message">
                            Feedback message
                        </label>
                        <Textarea
                            aria-describedby={
                                state.status === "idle"
                                    ? undefined
                                    : "feedback-status"
                            }
                            autoFocus
                            className="min-h-24"
                            id="feedback-message"
                            name="message"
                            placeholder="Cache updates regularly with your suggestions. Have an idea to improve this page? Tell the Cache team"
                            required
                        />
                        <div className="flex items-center justify-between gap-3">
                            <p
                                className={cn(
                                    "min-h-5 text-xs",
                                    state.status === "error"
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                )}
                                id="feedback-status"
                                role={
                                    state.status === "idle"
                                        ? undefined
                                        : "status"
                                }
                            >
                                {state.message}
                            </p>
                            <SubmitButton ref={submitButtonRef} />
                        </div>
                    </form>
                </div>
            </PopoverPopup>
        </Popover>
    );
}

/* @internal */
function SubmitButton({ ref }: { ref?: React.Ref<HTMLButtonElement> }) {
    const { pending } = useFormStatus();

    return (
        <Button
            className="rounded-full"
            loading={pending}
            ref={ref}
            size="sm"
            type="submit"
        >
            <Send
                aria-hidden="true"
                className="inline-block size-4 shrink-0"
                focusable="false"
            />
            Send
        </Button>
    );
}
