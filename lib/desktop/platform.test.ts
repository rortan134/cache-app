import { describe, expect, test } from "bun:test";
import { detectDesktopPlatform } from "@/lib/desktop/platform";

describe("detectDesktopPlatform", () => {
    test("detects major desktop OSes", () => {
        expect(
            detectDesktopPlatform(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            )
        ).toBe("macos");
        expect(
            detectDesktopPlatform(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
        ).toBe("windows");
        expect(
            detectDesktopPlatform(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
            )
        ).toBe("linux");
    });

    test("returns null for mobile and empty agents", () => {
        expect(
            detectDesktopPlatform(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
            )
        ).toBeNull();
        expect(
            detectDesktopPlatform(
                "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36"
            )
        ).toBeNull();
        expect(detectDesktopPlatform("")).toBeNull();
        expect(detectDesktopPlatform(null)).toBeNull();
    });
});
