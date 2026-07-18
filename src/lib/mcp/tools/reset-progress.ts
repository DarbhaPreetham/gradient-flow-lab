import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "reset_progress",
  title: "Reset my game progress",
  description:
    "Reset the signed-in user's ChromaWeave progress back to the first level. This clears completed levels and best scores. Requires explicit confirm=true.",
  inputSchema: {
    confirm: z
      .boolean()
      .describe("Must be true to actually reset progress. false performs a dry run."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  handler: async ({ confirm }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!confirm) {
      return {
        content: [
          { type: "text", text: "Dry run: call again with confirm=true to reset progress." },
        ],
        structuredContent: { reset: false },
      };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("game_progress")
      .upsert(
        {
          user_id: ctx.getUserId(),
          unlocked: ["l1"],
          completed: [],
          best: {},
        },
        { onConflict: "user_id" },
      );
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: "Progress reset to level 1." }],
      structuredContent: { reset: true },
    };
  },
});