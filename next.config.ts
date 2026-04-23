import { BASE_URL } from "@/lib/common/constants";
import { withGTConfig } from "gt-next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    assetPrefix: process.env.NODE_ENV === "development" ? undefined : BASE_URL,
    cacheComponents: true,
    experimental: {
        optimizePackageImports: [
            "@base-ui/react",
            "@base-ui/utils",
            "zod",
            "recharts",
            "@lexical/*",
            "lexical",
        ],
        turbopackFileSystemCacheForBuild: true,
        turbopackFileSystemCacheForDev: true,
    },
    async headers() {
        return [
            {
                headers: [...securityHeaders],
                source: "/(.*)",
            },
        ];
    },
    images: {
        minimumCacheTTL: 2_678_400, // 31 days
    },
    reactCompiler: true,
    async redirects() {
        return [
            {
                destination: "/legal/cookie-policy",
                permanent: true,
                source: "/cookie-policy",
            },
            {
                destination: "/legal/privacy-policy",
                permanent: true,
                source: "/privacy-policy",
            },
            {
                destination: "/legal/terms-of-service",
                permanent: true,
                source: "/terms-of-service",
            },
        ];
    },
    typescript: {
        ignoreBuildErrors: false,
    },
};

const securityHeaders = [
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
    },
    {
        key: "Referrer-Policy",
        value: "origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
] as const;

export default withGTConfig(nextConfig, {
    experimentalLocaleResolution: true,
    loadTranslationsPath: "./load-translations.ts",
});
