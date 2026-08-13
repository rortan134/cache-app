import * as React from "react";

export function FadeIn({
    enter = "auto",
    ...props
}: React.ComponentProps<typeof React.ViewTransition>) {
    return <React.ViewTransition {...props} default="none" enter={enter} />;
}
