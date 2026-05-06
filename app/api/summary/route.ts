import { getSessionUserId } from "@/lib/auth/session";
import {
    GenAiGenerationError,
    GenAiProtectionError,
} from "@/lib/collections/intelligence/error";
import { generateCollectionSummary } from "@/lib/collections/intelligence/service";
import {
    SectionDescriptionRequestSchema,
    SECTION_DESCRIPTION_FALLBACK_TEXT,
} from "@/lib/collections/intelligence/summary";

export async function POST(request: Request): Promise<Response> {
    const userId = await getSessionUserId();
    if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: unknown;
    try {
        rawBody = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON payload." },
            { status: 400 }
        );
    }

    const parsed = SectionDescriptionRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
        return Response.json(
            { error: "Invalid request payload." },
            { status: 400 }
        );
    }

    try {
        const result = await generateCollectionSummary({
            expanded: parsed.data.expanded ?? false,
            items: parsed.data.items,
            request,
            sectionTitle: parsed.data.sectionTitle,
            userId,
        });

        if (result.conclusions) {
            return Response.json({ conclusions: result.conclusions });
        }

        return Response.json({ summary: result.summary });
    } catch (error) {
        if (GenAiProtectionError.isInstance(error)) {
            const status = error.data.reason === "quota_exceeded" ? 429 : 403;
            return Response.json(
                {
                    error: error.data.message,
                    reason: error.data.reason,
                },
                { status }
            );
        }

        if (GenAiGenerationError.isInstance(error)) {
            return Response.json(
                {
                    error: error.data.message,
                    summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
                },
                { status: error.data.status ?? 500 }
            );
        }

        return Response.json(
            {
                error: "Unknown error",
                summary: SECTION_DESCRIPTION_FALLBACK_TEXT,
            },
            { status: 500 }
        );
    }
}
