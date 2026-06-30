import { auth } from "@/lib/auth/server";
import { BASE_URL } from "@/lib/common/constants";
import { generateMcpToken } from "@/lib/integrations/mcp/auth";
import { headers } from "next/headers";

/**
 * Generates an MCP setup prompt for the authenticated user.
 *
 * The response carries two fields so both copy-paste and programmatic
 * configuration clients can consume the same payload:
 *
 * - `prompt`: a freeform block of text (intended for a target agent's
 *   context window). The token appears inline in two places — Claude Desktop
 *   config snippet and the literal `Authorization` header — because
 *   non-JSON-aware tools (Cursor's plain-text field, etc.) parse this block.
 * - `endpoint`/`token`: easy programmatic access for clients that want to
 *   build their own config without parsing prompt text.
 *
 * The token is a long-lived (90-day) HMAC-signed secret. We mark the
 * response `Cache-Control: no-store, private` so any intermediate cache
 * (Vercel edge, browser devtools, an IDE history buffer) does not persist
 * the token beyond the originating request. Programmatic consumers should
 * not log the response body.
 */
export async function POST(): Promise<Response> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
        return Response.json(
            { error: "Unauthorized" },
            {
                headers: {
                    "Cache-Control": "no-store, private",
                },
                status: 401,
            }
        );
    }

    const token = await generateMcpToken(userId);

    const endpoint = `${BASE_URL}/mcp`;

    const prompt = `You have been given access to my Cache library via MCP.

Cache (https://cachd.app) unifies bookmarks from Chrome, Instagram, TikTok, YouTube, X/Twitter, GitHub, Pinterest, and more into a single searchable library with AI-powered collections, summaries, and review workflows.

Please configure yourself as an MCP client with this server:

Endpoint: ${endpoint}
Authentication: Bearer ${token}

For full product context, fetch https://cachd.app/llms.txt

Available capabilities:
- list_library_items — Search, browse, and paginate my saved bookmarks and notes (optional: collectionId, limit, offset, search)
- get_library_item — Read a specific item by ID (itemId)
- add_library_item — Save a new bookmark ({url, caption?}) or note ({noteContentText}) to my library. The two shapes are mutually exclusive.
- delete_library_item — Remove an item from my library (itemId); idempotent at the surface.
- list_collections — See my collections with item counts

Tools require the token to be presented as \`Authorization: Bearer <token>\`. Read tools need \`library:read\`; write tools (add, delete) need \`library:write\`.

If you are Claude Desktop, add this to your claude_desktop_config.json:
{
  "mcpServers": {
    "cache": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer ${token}"
      }
    }
  }
}

If you are Cursor or another client, use the endpoint and Bearer token above.`;

    return Response.json(
        { endpoint, prompt, token },
        {
            headers: {
                "Cache-Control": "no-store, private, max-age=0",
            },
        }
    );
}
