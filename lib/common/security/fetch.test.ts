import { describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import { isAbortError } from "@/lib/common/abort";
import {
    crossOriginSafeHeaders,
    fetchPublicHop,
    isRedirectStatus,
    nextRedirectMethod,
    type PublicHttpUrl,
    releaseResponseBodyBudget,
    withoutRequestBodyHeaders,
} from "@/lib/common/security/fetch";

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

describe("nextRedirectMethod", () => {
    test("rewrites POST to GET on 301 and 302", () => {
        expect(nextRedirectMethod(301, "POST")).toBe("GET");
        expect(nextRedirectMethod(302, "POST")).toBe("GET");
    });

    test("rewrites any non-GET/HEAD method to GET on 303", () => {
        expect(nextRedirectMethod(303, "POST")).toBe("GET");
        expect(nextRedirectMethod(303, "PUT")).toBe("GET");
        expect(nextRedirectMethod(303, "DELETE")).toBe("GET");
    });

    test("preserves the method on 307/308 and non-rewrite statuses", () => {
        expect(nextRedirectMethod(307, "POST")).toBe("POST");
        expect(nextRedirectMethod(308, "PUT")).toBe("PUT");
        expect(nextRedirectMethod(301, "PUT")).toBe("PUT");
        expect(nextRedirectMethod(302, "DELETE")).toBe("DELETE");
        expect(nextRedirectMethod(303, "GET")).toBe("GET");
        expect(nextRedirectMethod(303, "HEAD")).toBe("HEAD");
        expect(nextRedirectMethod(200, "POST")).toBe("POST");
    });

    test("compares the method case-insensitively, like the Fetch spec", () => {
        expect(nextRedirectMethod(301, "post")).toBe("GET");
        expect(nextRedirectMethod(302, "Post")).toBe("GET");
        expect(nextRedirectMethod(303, "put")).toBe("GET");
        expect(nextRedirectMethod(307, "post")).toBe("post");
    });
});

describe("withoutRequestBodyHeaders", () => {
    test("drops body headers when the method rewrites to GET", () => {
        const headers = withoutRequestBodyHeaders({
            "content-length": "42",
            "content-type": "application/json",
            "transfer-encoding": "chunked",
            "user-agent": "test",
        });
        expect(headers.get("content-length")).toBeNull();
        expect(headers.get("content-type")).toBeNull();
        expect(headers.get("transfer-encoding")).toBeNull();
        expect(headers.get("user-agent")).toBe("test");
    });
});

describe("isRedirectStatus", () => {
    test("matches only the Fetch redirect statuses", () => {
        for (const status of [301, 302, 303, 307, 308]) {
            expect(isRedirectStatus(status)).toBe(true);
        }
    });

    test("rejects other 3xx statuses (300, 304, 305, 306) and non-3xx", () => {
        for (const status of [200, 300, 304, 305, 306, 400, 500]) {
            expect(isRedirectStatus(status)).toBe(false);
        }
    });
});

describe("crossOriginSafeHeaders", () => {
    test("keeps only allowlisted headers on a cross-origin hop", () => {
        const headers = crossOriginSafeHeaders({
            Accept: "image/*",
            "Accept-Language": "en",
            Authorization: "Bearer secret",
            "Content-Type": "application/json",
            Cookie: "session=1",
            Range: "bytes=0-100",
            Referer: "https://example.com/article/123",
            "User-Agent": "test",
            "X-Api-Key": "secret",
        });
        expect(headers.get("accept")).toBe("image/*");
        expect(headers.get("accept-language")).toBe("en");
        expect(headers.get("range")).toBe("bytes=0-100");
        expect(headers.get("user-agent")).toBe("test");
        // The referer crosses origins reduced to its origin only, like browsers.
        expect(headers.get("referer")).toBe("https://example.com/");
        expect(headers.get("authorization")).toBeNull();
        expect(headers.get("cookie")).toBeNull();
        expect(headers.get("x-api-key")).toBeNull();
        expect(headers.get("content-type")).toBeNull();
    });

    test("drops an unparseable referer", () => {
        const headers = crossOriginSafeHeaders({ Referer: "not a url" });
        expect(headers.get("referer")).toBeNull();
    });
});

// A server that sends headers and one chunk, then never closes the body — a
// host that stalls after its headers.
function stallingServer(): Server {
    return createServer((_request, response) => {
        response.writeHead(200, { "content-type": "text/plain" });
        response.write("chunk");
    });
}

function startServer(server: Server): Promise<number> {
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (address === null || typeof address === "string") {
                throw new Error("Expected a TCP port");
            }
            resolve(address.port);
        });
    });
}

function stopServer(server: Server): Promise<void> {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(() => resolve()));
}

function hostFor(port: number): PublicHttpUrl {
    return {
        preferredAddress: "127.0.0.1",
        url: new URL(`http://127.0.0.1:${port}/`),
    };
}

describe("fetchPublicHop body budget", () => {
    test("a body that stalls after its headers aborts when the budget fires", async () => {
        const server = stallingServer();
        try {
            const port = await startServer(server);
            const response = await fetchPublicHop(hostFor(port), {
                timeoutMs: 100,
            });
            const reader = response.body?.getReader();
            expect(reader).toBeDefined();
            await reader?.read();
            const error = await reader?.read().then(
                () => null,
                (reason: unknown) => reason
            );
            expect(isAbortError(error)).toBe(true);
        } finally {
            await stopServer(server);
        }
    });

    test("a released body outlives the budget like a client-paced stream", async () => {
        const server = stallingServer();
        try {
            const port = await startServer(server);
            const response = await fetchPublicHop(hostFor(port), {
                timeoutMs: 100,
            });
            releaseResponseBodyBudget(response);
            const reader = response.body?.getReader();
            expect(reader).toBeDefined();
            await reader?.read();
            await sleep(200); // the budget has fired by now
            const settled = await Promise.race([
                reader?.read().then(
                    () => true,
                    () => true
                ) ?? Promise.resolve(true),
                sleep(300).then(() => false),
            ]);
            expect(settled).toBe(false); // still pending: no abort
            await reader?.cancel().catch(() => undefined);
        } finally {
            await stopServer(server);
        }
    });

    test("a fully consumed body completes normally and keeps its URL", async () => {
        const server = createServer((_request, response) => {
            response.writeHead(200, { "content-type": "text/plain" });
            response.end("ok");
        });
        try {
            const port = await startServer(server);
            const response = await fetchPublicHop(hostFor(port), {
                timeoutMs: 5000,
            });
            expect(await response.text()).toBe("ok");
            expect(response.url).toBe(`http://127.0.0.1:${port}/`);
        } finally {
            await stopServer(server);
        }
    });
});
