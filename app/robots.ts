import { BASE_URL } from "@/lib/common/constants";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            allow: "/",
            disallow: "/mcp",
            userAgent: "*",
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
