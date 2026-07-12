"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/common/cn";
import { stopPropagationForPrintableKeys } from "@/lib/common/dom";
import { createFeedback } from "@/lib/feedback/actions";
import type { FeedbackActionState } from "@/lib/feedback/schema";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { Send } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";

const INITIAL_FEEDBACK_ACTION_STATE: FeedbackActionState = {
    message: "",
    status: "idle",
} satisfies FeedbackActionState;

export function FeedbackWidget({
    context,
    openOnHover = true,
    ...props
}: FeedbackWidgetProps) {
    const pathname = usePathname();
    const isReducedMotion = useReducedMotion();
    const [isOpen, setIsOpen] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);
    const submitButtonRef = React.useRef<HTMLButtonElement>(null);

    const submitFeedback = useStableCallback(
        async (
            previousState: FeedbackActionState,
            formData: FormData
        ): Promise<FeedbackActionState> => {
            const nextState = await createFeedback(previousState, formData);
            if (nextState.status !== "success") {
                return nextState;
            }
            // Gate the celebration behind prefers-reduced-motion. The OS setting
            // is unknown on first render (`useReducedMotion` returns `null`),
            // so default to allowing the effect and only suppress it once the
            // hook has confirmed the user opted out.
            if (!isReducedMotion) {
                const rect = submitButtonRef.current?.getBoundingClientRect();
                if (rect) {
                    import(/* webpackIgnore: true */ "react-confetti-burst")
                        .then(({ createConfettiExplosion }) => {
                            createConfettiExplosion({
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2,
                            });
                        })
                        .catch(() => {
                            // Optional celebration; form success already committed.
                        });
                }
            }
            formRef.current?.reset();
            setIsOpen(false);
            return nextState;
        }
    );

    const [state, formAction] = React.useActionState(
        submitFeedback,
        INITIAL_FEEDBACK_ACTION_STATE
    );

    const handleToggleFeedbackWidget = useStableCallback(() => {
        setIsOpen((isOpenValue) => !isOpenValue);
    });

    useHotkeys("F", handleToggleFeedbackWidget, {
        description: "Toggle feedback widget",
    });

    return (
        <Popover onOpenChange={setIsOpen} open={isOpen}>
            <PopoverTrigger {...props} openOnHover={openOnHover} />
            <PopoverPopup className="*:p-2" positionMethod="fixed">
                <div className="space-y-3">
                    <form
                        action={formAction}
                        className="space-y-4"
                        ref={formRef}
                    >
                        <input name="context" type="hidden" value={context} />
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
                            onKeyDown={stopPropagationForPrintableKeys}
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

interface FeedbackWidgetProps
    extends React.ComponentProps<typeof PopoverTrigger> {
    context: string;
}

/* @internal */
function SubmitButton({ ref }: { ref?: React.Ref<HTMLButtonElement> }) {
    const { pending } = useFormStatus();

    return (
        <Button
            className="rounded-full"
            isLoading={pending}
            ref={ref}
            size="sm"
            type="submit"
        >
            <Send
                aria-hidden
                className="inline-block size-4 shrink-0"
                focusable="false"
            />
            Send
        </Button>
    );
}
