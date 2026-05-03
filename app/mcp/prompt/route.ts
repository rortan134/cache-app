import { auth } from "@/lib/auth/server";
import { BASE_URL } from "@/lib/common/constants";
import { generateMcpToken } from "@/lib/integrations/mcp/auth";
import { headers } from "next/headers";

/**
 * Generates an MCP setup prompt for the authenticated user.
 *
 * The prompt includes the MCP endpoint URL and a Bearer token so the user
 * can paste it into another agent to configure MCP access to their library.
 */
export async function POST(): Promise<Response> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await generateMcpToken(userId);

    const prompt = `You have been given access to my Cache library via MCP.

Please configure yourself as an MCP client with this server:

Endpoint: ${BASE_URL}/mcp
Authentication: Bearer ${token}

Available capabilities:
- list_library_items — Search and browse my saved bookmarks and notes
- get_library_item — Read a specific item by ID
- add_library_item — Save a new bookmark or note to my library
- delete_library_item — Remove an item from my library
- list_collections — See my collections

If you are Claude Desktop, add this to your claude_desktop_config.json:
{
  "mcpServers": {
    "cache": {
      "url": "${BASE_URL}/mcp",
      "headers": {
        "Authorization": "Bearer ${token}"
      }
    }
  }
}

If you are Cursor or another client, use the endpoint and Bearer token above.`;

    return Response.json({ prompt });
}
