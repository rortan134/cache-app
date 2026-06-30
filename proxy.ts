import { createNextMiddleware } from "gt-next/middleware";
import type { NextRequest } from "next/server";

const gtMiddleware = createNextMiddleware();

export function proxy(request: NextRequest) {
    if (request.nextUrl.pathname === "/mcp" && request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Headers":
                    "authorization,content-type,accept,mcp-session-id",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Max-Age": "86400",
                Vary: "Origin",
            },
            status: 204,
        });
    }

    return gtMiddleware(request);
}

export const config = {
    // Matches every app path. `/mcp` is handled above before the gt middleware
    // runs, so we don't need a per-path exclusion here. Still skip the heavy
    // paths (assets, api, _next) so the proxy doesn't slow them down.
    matcher: ["/((?!api/|static/|_next/|_vercel/|[^/]+\\.[^/]+$).*)"],
};
