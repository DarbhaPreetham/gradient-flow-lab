# ChromaWeave Security & Privacy

This document describes how user accounts, passwords, and data are protected.

---

## 1. Passwords

ChromaWeave **never stores plaintext passwords** in application code or the database.

- Passwords are handled exclusively by **Lovable Cloud / Supabase Auth**.
- Supabase Auth hashes passwords server-side with **bcrypt** before storage.
- The app only sends passwords to Supabase Auth's secure endpoints; they are never logged or persisted locally.

---

## 2. Database security

The backend is a Postgres database managed by Lovable Cloud with **Row Level Security (RLS)** enabled on every user-facing table.

### Tables

- `public.profiles` — display name and avatar.
- `public.game_progress` — unlocked levels, completed levels, and best move counts.

### RLS policies

- Users can **read, insert, update, and delete only their own** `profiles` and `game_progress` rows.
- `profiles` are viewable by any authenticated user (for simple social features), but only editable by the owner.
- `game_progress` is strictly scoped to `auth.uid() = user_id`.

### Database triggers

- `handle_new_user()` — automatically creates a profile and progress row when a new auth user is inserted.
- `touch_updated_at()` — keeps `updated_at` timestamps current.

Both helper functions are revoked from `PUBLIC`, `anon`, and `authenticated` to minimize attack surface.

---

## 3. Client-side security

- The auto-generated Supabase client (`src/integrations/supabase/client.ts`) uses the **publishable (anon) key** in the browser.
- No service-role or admin keys are exposed to the frontend.
- Server-side MCP tools create their own short-lived Supabase clients scoped to the caller's bearer token.

---

## 4. OAuth & agent connections

The MCP endpoint (`/mcp`) is protected by **OAuth 2.0** issued by Supabase Auth.

- Agents must authenticate as a ChromaWeave user.
- Tools can only read/write data belonging to that user because RLS still applies.
- The destructive `reset_progress` tool requires `confirm: true`.

See [`docs/MCP.md`](MCP.md) for integration details.

---

## 5. Environment secrets

Sensitive values live in `.env` and are injected at build/runtime by Lovable Cloud. `.env` is listed in `.gitignore` and must never be committed.

Required variables:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

---

## 6. Privacy notes

- The app stores only email, display name, avatar URL, and game progress.
- No payment data, location, or contacts are collected.
- For production, update [`PRIVACY.md`](../PRIVACY.md) and [`TERMS.md`](../TERMS.md) with jurisdiction-specific language and a data-retention policy.
