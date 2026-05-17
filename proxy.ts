import { createNextMiddleware } from "gt-next/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const gtMiddleware = createNextMiddleware();

export function proxy(request: NextRequest) {
    if (request.method === "OPTIONS") {
        // Custom headers must be added to the *request*
        // headers so server components see them via `headers()`. Setting them as
        // response headers via `NextResponse.next({ headers })` corrupts Next.js
        // 16's router state parsing during soft navigation.
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("Access-Control-Allow-Origin", "*");
        requestHeaders.set(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,DELETE,OPTIONS"
        );
        requestHeaders.set("Access-Control-Allow-Headers", "*");

        return NextResponse.next({
            request: { headers: requestHeaders },
        });
    }

    return gtMiddleware(request);
}

export const config = {
    matcher: ["/((?!api|mcp|static|.*\\..*|_next).*)"],
};
