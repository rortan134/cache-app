import { describe, expect, test } from "bun:test";
import {
    isBlockedHostname,
    parseHttpUrl,
    parsePublicHttpUrl,
    resolvesToBlockedHostname,
} from "@/lib/common/net";

describe("isBlockedHostname", () => {
    test("blocks private IPv4 and localhost names", () => {
        expect(isBlockedHostname("localhost")).toBe(true);
        expect(isBlockedHostname("localhost.")).toBe(true);
        expect(isBlockedHostname("cache.localhost")).toBe(true);
        expect(isBlockedHostname("cache.localhost.")).toBe(true);
        expect(isBlockedHostname("cache.internal")).toBe(true);
        expect(isBlockedHostname("cache.internal.")).toBe(true);
        expect(isBlockedHostname("127.0.0.1")).toBe(true);
        expect(isBlockedHostname("127.0.0.1.")).toBe(true);
        expect(isBlockedHostname("10.0.0.1")).toBe(true);
        expect(isBlockedHostname("172.16.0.1")).toBe(true);
        expect(isBlockedHostname("192.168.1.1")).toBe(true);
        expect(isBlockedHostname("169.254.1.1")).toBe(true);
        expect(isBlockedHostname("100.64.0.1")).toBe(true);
    });

    test("blocks local-only IPv6 addresses", () => {
        expect(isBlockedHostname("[::]")).toBe(true);
        expect(isBlockedHostname("[::1]")).toBe(true);
        expect(isBlockedHostname("[fd00::1]")).toBe(true);
        expect(isBlockedHostname("[fc00::1]")).toBe(true);
        expect(isBlockedHostname("[fe80::1]")).toBe(true);
        expect(isBlockedHostname("fe80::1%eth0")).toBe(true);
        expect(isBlockedHostname("[fe80::1%eth0]")).toBe(true);
        expect(isBlockedHostname("[febf::1]")).toBe(true);
        expect(isBlockedHostname("[fec0::1]")).toBe(true);
    });

    test("blocks IPv4-mapped private IPv6 addresses", () => {
        expect(isBlockedHostname("[::ffff:127.0.0.1]")).toBe(true);
        expect(isBlockedHostname("[::ffff:7f00:1]")).toBe(true);
        expect(isBlockedHostname("[::ffff:a00:1]")).toBe(true);
        expect(isBlockedHostname("[::ffff:c0a8:101]")).toBe(true);
    });

    test("blocks reserved and multicast IP ranges", () => {
        expect(isBlockedHostname("192.0.2.1")).toBe(true);
        expect(isBlockedHostname("224.0.0.1")).toBe(true);
        expect(isBlockedHostname("192.88.99.1")).toBe(true);
        expect(isBlockedHostname("[2001:db8::1]")).toBe(true);
        expect(isBlockedHostname("[ff02::1]")).toBe(true);
        expect(isBlockedHostname("[2002::1]")).toBe(true);
    });

    test("allows public hostnames and public IP addresses", () => {
        expect(isBlockedHostname("example.com")).toBe(false);
        expect(isBlockedHostname("8.8.8.8")).toBe(false);
        expect(isBlockedHostname("[2606:4700:4700::1111]")).toBe(false);
        expect(isBlockedHostname("2606:4700:4700::1111%eth0")).toBe(false);
        expect(isBlockedHostname("[::ffff:808:808]")).toBe(false);
        expect(isBlockedHostname("[::808:808]")).toBe(false);
    });

    test("does not DNS-resolve ordinary hostnames", () => {
        expect(isBlockedHostname("private-address.example")).toBe(false);
    });
});

describe("parseHttpUrl", () => {
    test("accepts only HTTP URLs", () => {
        expect(parseHttpUrl("https://example.com")?.href).toBe(
            "https://example.com/"
        );
        expect(parseHttpUrl("http://example.com")?.href).toBe(
            "http://example.com/"
        );
        expect(parseHttpUrl("ftp://example.com")).toBeNull();
        expect(parseHttpUrl("not-a-url")).toBeNull();
    });
});

describe("resolvesToBlockedHostname", () => {
    test("blocks local aliases and IP literals without resolver calls", async () => {
        let resolverCallCount = 0;

        await expect(
            resolvesToBlockedHostname("localhost", () => {
                resolverCallCount += 1;
                return Promise.resolve([{ address: "8.8.8.8" }]);
            })
        ).resolves.toBe(true);

        expect(resolverCallCount).toBe(0);
    });

    test("allows hostnames when every resolved address is public", async () => {
        await expect(
            resolvesToBlockedHostname("example.com", async () => [
                { address: "8.8.8.8" },
                { address: "2606:4700:4700::1111" },
            ])
        ).resolves.toBe(false);
    });

    test("blocks hostnames when any resolved address is blocked", async () => {
        await expect(
            resolvesToBlockedHostname("example.com", async () => [
                { address: "8.8.8.8" },
                { address: "10.0.0.5" },
            ])
        ).resolves.toBe(true);
    });

    test("blocks hostnames when resolution fails or returns no records", async () => {
        await expect(
            resolvesToBlockedHostname("empty.test", async () => [])
        ).resolves.toBe(true);

        await expect(
            resolvesToBlockedHostname("broken.test", () =>
                Promise.reject(new Error("lookup failed"))
            )
        ).resolves.toBe(true);
    });
});

describe("parsePublicHttpUrl", () => {
    test("returns the normalized URL only for public HTTP hosts", async () => {
        const parsed = await parsePublicHttpUrl(
            "https://example.com/path",
            async () => [{ address: "8.8.8.8" }]
        );

        expect(parsed?.href).toBe("https://example.com/path");

        await expect(
            parsePublicHttpUrl("https://localhost/path", async () => [
                { address: "8.8.8.8" },
            ])
        ).resolves.toBeNull();

        await expect(
            parsePublicHttpUrl("ftp://example.com/path", async () => [
                { address: "8.8.8.8" },
            ])
        ).resolves.toBeNull();
    });
});
