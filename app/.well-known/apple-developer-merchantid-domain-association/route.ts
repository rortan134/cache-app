import { APPLE_DOMAIN_ASSOCIATION } from "@/lib/common/constants";

export const runtime = "edge";

export function GET() {
    return new Response(APPLE_DOMAIN_ASSOCIATION, {
        status: 200,
    });
}
