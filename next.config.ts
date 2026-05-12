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
            "@lexical/extension",
            "@lexical/html",
            "@lexical/react",
            "@lexical/rich-text",
            "@lexical/selection",
            "lexical",
            "class-variance-authority",
            "motion",
            "swiper",
            "swiper/react",
            "swiper/modules",
            "streamdown",
            "zod",
        ],
    },
    async headers() {
        return [
            {
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400, stale-while-revalidate=604800",
                    },
                ],
                source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2|ttf|eot)",
            },
            {
                headers: [
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, OPTIONS",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "Content-Type, Accept",
                    },
                ],
                source: "/.well-known/:path*",
            },
            {
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "false" },
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, OPTIONS",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "Content-Type, Accept",
                    },
                ],
                source: "/api/auth/.well-known/:path*",
            },
            {
                headers: [...securityHeaders],
                source: "/(.*)",
            },
            // Block access to sourcemap files (defense in depth)
            {
                headers: [
                    {
                        key: "x-robots-tag",
                        value: "noindex",
                    },
                ],
                source: "/(.*)\\.map$",
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
                destination: "https://x.com/gsmmtt",
                permanent: false,
                source: "/x",
            },
            {
                destination: "https://github.com/rortan134/cache",
                permanent: false,
                source: "/github",
            },
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
    async rewrites() {
        return [
            {
                destination: "/llms.txt",
                source: "/llms-full.txt",
            },
        ];
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
