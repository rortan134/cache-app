import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

const mockLookup =
    mock<
        (
            hostname: string,
            options: { all: true; verbatim: true }
        ) => Promise<Array<{ address: string; family: 4 | 6 }>>
    >();

mock.module("server-only", () => ({}));

mock.module("node:dns/promises", () => ({
    lookup: mockLookup,
}));

let parsePublicHttpUrl: typeof import("@/lib/common/server-net").parsePublicHttpUrl;
let resolvesToBlockedHostname: typeof import("@/lib/common/server-net").resolvesToBlockedHostname;

beforeAll(async () => {
    ({ parsePublicHttpUrl, resolvesToBlockedHostname } = await import(
        "@/lib/common/server-net"
    ));
});

beforeEach(() => {
    mockLookup.mockReset();
});

describe("resolvesToBlockedHostname", () => {
    test("blocks local aliases and IP literals without DNS lookup", async () => {
        await expect(resolvesToBlockedHostname("localhost")).resolves.toBe(
            true
        );
        await expect(resolvesToBlockedHostname("127.0.0.1")).resolves.toBe(
            true
        );
        expect(mockLookup).not.toHaveBeenCalled();
    });

    test("allows hostnames when every DNS record is public unicast", async () => {
        mockLookup.mockResolvedValue([
            { address: "8.8.8.8", family: 4 },
            { address: "2606:4700:4700::1111", family: 6 },
        ]);

        await expect(resolvesToBlockedHostname("example.com")).resolves.toBe(
            false
        );
    });

    test("blocks hostnames when any DNS record is private or local", async () => {
        mockLookup.mockResolvedValue([
            { address: "8.8.8.8", family: 4 },
            { address: "10.0.0.5", family: 4 },
        ]);

        await expect(resolvesToBlockedHostname("example.com")).resolves.toBe(
            true
        );
    });

    test("blocks hostnames when DNS lookup fails or returns no records", async () => {
        mockLookup.mockResolvedValueOnce([]);
        await expect(resolvesToBlockedHostname("empty.test")).resolves.toBe(
            true
        );

        mockLookup.mockRejectedValueOnce(new Error("lookup failed"));
        await expect(resolvesToBlockedHostname("broken.test")).resolves.toBe(
            true
        );
    });
});

describe("parsePublicHttpUrl", () => {
    test("returns public HTTP URLs after DNS validation", async () => {
        mockLookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);

        const parsed = await parsePublicHttpUrl("https://example.com/path");

        expect(parsed?.href).toBe("https://example.com/path");
    });

    test("rejects invalid protocols and DNS-blocked hosts", async () => {
        await expect(
            parsePublicHttpUrl("ftp://example.com")
        ).resolves.toBeNull();
        expect(mockLookup).not.toHaveBeenCalled();

        mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
        await expect(
            parsePublicHttpUrl("https://private-address.example")
        ).resolves.toBeNull();
    });
});
