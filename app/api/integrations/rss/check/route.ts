import { requireRouteUserId } from "@/lib/auth/session";
import { createLogger } from "@/lib/common/logs/console/logger";
import { refreshFeedsForUser } from "@/lib/integrations/rss/service";

const log = createLogger("api:integrations:rss:check");

export async function POST() {
    const auth = await requireRouteUserId();
    if (auth instanceof Response) {
        return auth;
    }

    try {
        const result = await refreshFeedsForUser({
            now: new Date(),
            userId: auth.userId,
        });

        if (result.errors.length > 0) {
            log.warn("RSS refresh completed with errors", {
                errorCount: result.errors.length,
                errors: result.errors,
            });
        }

        return Response.json({
            errors: result.errors,
            importedCount: result.importedCount,
            refreshedCount: result.refreshedFeedIds.length,
            skippedCount: result.skippedFeedIds.length,
        });
    } catch (error) {
        log.error("RSS refresh failed", error);
        return Response.json(
            { error: "Could not refresh RSS feeds." },
            { status: 500 }
        );
    }
}
