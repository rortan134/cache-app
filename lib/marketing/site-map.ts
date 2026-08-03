import { BASE_URL } from "@/lib/common/constants";
import { normalizeURL } from "@/lib/common/url";

export interface PublicStaticRoute {
    description: string;
    path: `/${string}`;
    priority: number;
    title: string;
}

export const PUBLIC_STATIC_ROUTES = [
    {
        description:
            "The AI bookmark manager for busy people. View, manage, and organize bookmarks across platforms.",
        path: "/",
        priority: 1,
        title: "Cache — the AI bookmark manager",
    },
    {
        description: "Browse and search your saved bookmarks and notes.",
        path: "/library",
        priority: 0.85,
        title: "Library",
    },
    {
        description: "The latest product updates from Cache.",
        path: "/changelog",
        priority: 0.7,
        title: "Changelog",
    },
    {
        description: "Security information and documentation for Cache.",
        path: "/security",
        priority: 0.7,
        title: "Security",
    },
    {
        description: "Legal documents and policies for Cache.",
        path: "/legal",
        priority: 0.7,
        title: "Legal",
    },
    {
        description: "Cache terms of service.",
        path: "/legal/terms-of-service",
        priority: 0.7,
        title: "Terms of Service",
    },
    {
        description: "Cache privacy policy.",
        path: "/legal/privacy-policy",
        priority: 0.7,
        title: "Privacy Policy",
    },
] satisfies readonly PublicStaticRoute[];

export function getLocalizedUrl(
    locale: string,
    path: PublicStaticRoute["path"]
): string {
    return normalizeURL(
        path === "/" ? `${BASE_URL}/${locale}` : `${BASE_URL}/${locale}${path}`
    );
}
