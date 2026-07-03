import { createNextMiddleware } from "gt-next/middleware";
import type { NextRequest } from "next/server";

const gtMiddleware = createNextMiddleware();

export function middleware(request: NextRequest) {
    return gtMiddleware(request);
}

export const config = {
    matcher: [
        "/((?!api/|static/|_next/|_vercel/|.well-known/workflow/|[^/]+\\.[^/]+$).*)",
    ],
};
