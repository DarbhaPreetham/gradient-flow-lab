# ChromaWeave MCP Agent Integration

ChromaWeave exposes an OAuth-protected MCP (Model Context Protocol) server so agents like Claude, ChatGPT, or Codex can read a signed-in player's profile and progress — and reset progress when explicitly confirmed.

---

## Endpoint

```text
https://gradient-flow-lab.lovable.app/mcp
```

Use this URL as a **custom MCP connector** in your agent platform.

---

## Authentication

The MCP server uses OAuth 2.0 with Supabase Auth as the issuer.

- The user must already have a ChromaWeave account.
- The agent redirects the user to the ChromaWeave consent screen.
- After approval, the agent receives a bearer token scoped to that user.
- All tool calls execute with that user's permissions (RLS applies).

Manifest: `.lovable/mcp/manifest.json`

---

## Tools

### `get_profile`

Returns the signed-in user's display name and avatar.

**Input:** none  
**Output:**

```json
{
  "profile": {
    "id": "...",
    "display_name": "Maya",
    "avatar_url": "..."
  },
  "email": "maya@example.com"
}
```

### `get_progress`

Returns the user's unlocked levels, completed levels, and best move counts.

**Input:** none  
**Output:**

```json
{
  "progress": {
    "unlocked": ["l1", "l2"],
    "completed": ["l1"],
    "best": { "l1": 12 },
    "updated_at": "2026-09-06T..."
  }
}
```

### `reset_progress`

Resets the user's progress back to level 1. This is destructive and requires explicit confirmation.

**Input:** `{ "confirm": true }`  
**Output:** `{ "reset": true }`

Calling with `confirm: false` performs a dry run and explains what would happen.

---

## Implementation

The MCP server is defined in `src/lib/mcp/index.ts` and uses `@lovable.dev/mcp-js`.

Tool handlers live in:

- `src/lib/mcp/tools/get-profile.ts`
- `src/lib/mcp/tools/get-progress.ts`
- `src/lib/mcp/tools/reset-progress.ts`

Each tool creates a Supabase client scoped to the caller's bearer token, so RLS policies enforce per-user data access.

Auto-generated TanStack routes handle protocol wiring:

- `src/routes/mcp.ts`
- `src/routes/[.mcp]/list-tools.ts`
- `src/routes/[.mcp]/invoke-tool/$tool.ts`

The Vite plugin (`vite.config.ts`) regenerates these routes when the MCP definition changes.

---

## Adding a new tool

1. Create `src/lib/mcp/tools/<name>.ts` using `defineTool`.
2. Import and add it to the `tools` array in `src/lib/mcp/index.ts`.
3. The Vite MCP plugin will regenerate the manifest and routes on the next build.
