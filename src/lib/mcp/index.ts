import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import getProgressTool from "./tools/get-progress";
import resetProgressTool from "./tools/reset-progress";

// The OAuth issuer must be the direct Supabase host. VITE_SUPABASE_PROJECT_ID
// is inlined by Vite at build time. The fallback keeps the issuer well-formed
// during the manifest-extract eval; the published build inlines the real ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "chromaweave-mcp",
  title: "ChromaWeave",
  version: "0.1.0",
  instructions:
    "Tools for ChromaWeave, a meditative color-tapestry puzzle. Use `get_profile` and `get_progress` to inspect the signed-in player's account and level progress. Use `reset_progress` (with confirm=true) to wipe progress back to level 1.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfileTool, getProgressTool, resetProgressTool],
});