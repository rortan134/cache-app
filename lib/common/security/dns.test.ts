import { beforeEach, describe, expect, mock, test } from "bun:test";

interface LookupEntry {
    address: string;
    family: number;
}

let lookupCalls = 0;
let inFlight = 0;
let maxInFlight = 0;
let resolutionDelayMs = 0;
let resolvedAddresses: LookupEntry[] = [];

mock.module("node:dns/promises", () => ({
    default: {
        lookup: (_hostname: string) => {
            lookupCalls += 1;
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            return new Promise<LookupEntry[]>((resolve) => {
                setTimeout(() => {
                    inFlight -= 1;
                    resolve(resolvedAddresses);
                }, resolutionDelayMs);
            });
        },
    },
}));

const { DnsTimeoutError, resolveHostAddresses } = await import("./dns");

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

describe("resolveHostAddresses", () => {
    beforeEach(() => {
        lookupCalls = 0;
        inFlight = 0;
        maxInFlight = 0;
        resolutionDelayMs = 100;
        resolvedAddresses = [{ address: "192.0.2.1", family: 4 }];
    });

    test("never runs more than MAX_CONCURRENT_DNS_LOOKUPS underlying lookups", async () => {
        const hosts = [
            "a.example.com",
            "b.example.com",
            "c.example.com",
            "d.example.com",
        ];

        const results = await Promise.all(
            hosts.map((host) => resolveHostAddresses(host, { timeoutMs: 2000 }))
        );

        expect(results).toHaveLength(4);
        expect(results.map((result) => result.preferred)).toEqual(
            results.map(() => "192.0.2.1")
        );
        expect(lookupCalls).toBe(4);
        expect(maxInFlight).toBeLessThanOrEqual(2);
    });

    test("a lookup delayed past the deadline still holds its slot until it settles", async () => {
        resolutionDelayMs = 250;

        const outcomes = await Promise.allSettled([
            resolveHostAddresses("a.example.com", { timeoutMs: 30 }),
            resolveHostAddresses("b.example.com", { timeoutMs: 30 }),
            resolveHostAddresses("c.example.com", { timeoutMs: 30 }),
            resolveHostAddresses("d.example.com", { timeoutMs: 30 }),
        ]);

        expect(
            outcomes.every(
                (outcome) =>
                    outcome.status === "rejected" &&
                    outcome.reason instanceof DnsTimeoutError
            )
        ).toBe(true);
        expect(lookupCalls).toBe(2);
        expect(maxInFlight).toBeLessThanOrEqual(2);

        await sleep(300);

        const released = await resolveHostAddresses("e.example.com", {
            timeoutMs: 2000,
        });
        expect(released.preferred).toBe("192.0.2.1");
    });
});
