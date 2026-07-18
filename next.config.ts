import { withGTConfig } from "gt-next/config";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

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
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
    },
];

const nextConfig: NextConfig = {
    cacheComponents: true,
    experimental: { useTypeScriptCli: true },
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
    partialPrefetching: true,
    reactCompiler: true,
    async redirects() {
        return [
            {
                destination: "https://x.com/gsmmtt",
                permanent: false,
                source: "/x",
            },
            {
                destination: "https://github.com/rortan134/cache-app",
                permanent: false,
                source: "/github",
            },
            {
                destination: "/legal/privacy-policy",
                permanent: true,
                source: "/privacy-policy",
            },
            {
                destination: "/legal/privacy-policy",
                permanent: true,
                source: "/privacy",
            },
            {
                destination: "/legal/terms-of-service",
                permanent: true,
                source: "/terms-of-service",
            },
            {
                destination: "/",
                permanent: true,
                source: "/manifesto",
            },
            {
                destination: "https://docs.cachd.app/docs/changelog",
                permanent: false,
                source: "/changelog",
            },
            {
                destination: "https://docs.cachd.app/docs/security",
                permanent: false,
                source: "/security",
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

export default withWorkflow(
    withGTConfig(nextConfig, {
        getLocalePath: "./get-locale.ts",
        getRegionPath: "./get-region.ts",
        loadTranslationsPath: "./load-translations.ts",
    })
);
