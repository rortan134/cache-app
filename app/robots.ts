import { BASE_URL } from "@/lib/common/constants";
import type { MetadataRoute } from "next";

const DISALLOWED_PATHS = ["/mcp"];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            allow: "/",
            disallow: DISALLOWED_PATHS,
            userAgent: "*",
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
