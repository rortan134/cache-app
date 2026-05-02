import { APP_NAME, BASE_URL, DEFAULT_LOCALE } from "@/lib/common/constants";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        background_color: "#ffffff",
        categories: ["productivity", "utilities"],
        description:
            "Cache is a tool to unify your bookmarks across all platforms.",
        dir: "ltr",
        display: "standalone",
        icons: [
            {
                purpose: "maskable",
                sizes: "192x192",
                src: "/web-app-manifest-192x192.png",
                type: "image/png",
            },
            {
                purpose: "maskable",
                sizes: "512x512",
                src: "/web-app-manifest-512x512.png",
                type: "image/png",
            },
        ],
        lang: DEFAULT_LOCALE,
        name: APP_NAME,
        orientation: "any",
        prefer_related_applications: true,
        scope: BASE_URL,
        short_name: APP_NAME,
        start_url: "/?utm_source=pwa_homescreen&__pwa=1",
        theme_color: "#ffffff",
    };
}
