# ChromaWeave

A meditative color-tapestry puzzle built for the web, PWA, Android, and iOS.

**Live preview:** https://id-preview--04fe0194-cad7-4536-97bd-710ecbf46326.lovable.app  
**Published app:** https://gradient-flow-lab.lovable.app

---

## What is ChromaWeave?

ChromaWeave is a relaxing, accessibility-first puzzle game for players aged 7 to 70. Each level is a woven grid of colored tiles that has been gently shuffled. Your goal is to drag and swap tiles until the colors flow smoothly from corner to corner, matching the hidden gradient.

- **No timer, no penalties** — play at your own pace.
- **12 handcrafted tapestries** across Beginner, Casual, and Master difficulties.
- **Soothing synthesized audio** with ambient pads and pentatonic chimes.
- **Light & dark themes**, haptics, color-blind assist, and an interactive first-play tutorial.
- **Cloud-synced progress** when you sign in with email or Google.
- **Agent integration** via OAuth-protected MCP tools.

---

## Quick start

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev

# Build for production
bun run build

# Run linting
bun run lint
```

> This project uses **Bun** and **TanStack Start**. Node.js can be used as a fallback, but Bun is the tested runtime in CI.

---

## Environment variables

Create a `.env` file at the project root with the variables injected by Lovable Cloud:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

These values are managed by Lovable Cloud. Do not commit `.env` to GitHub.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 + Vite) |
| Styling | Tailwind CSS v4 with custom design tokens |
| Auth & Database | Lovable Cloud / Supabase (RLS-secured Postgres) |
| Server functions | `createServerFn` from `@tanstack/react-start` |
| Mobile wrappers | Capacitor 8 for Android & iOS |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) |
| Agent tools | `@lovable.dev/mcp-js` with OAuth 2.0 |

---

## Project structure

```text
src/
  components/           React components (game, auth, tutorial, etc.)
  hooks/                React hooks (useAuth)
  lib/                  App libraries (MCP server, error handling)
  routes/               TanStack file-based routes
  integrations/         Auto-generated Supabase & Lovable auth clients
  styles.css            Tailwind v4 theme + ChromaWeave design tokens
  server.ts             SSR error wrapper
  start.ts              Start instance with Supabase auth middleware
supabase/migrations/    Database schema + RLS policies
public/                 PWA manifest, icons, favicon
android/                Capacitor Android project
ios/                    Capacitor iOS project
docs/                   Architecture & deployment guides
```

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — How the game, state, audio, and cloud sync work.
- [`docs/LEVELS.md`](docs/LEVELS.md) — The 12 levels and difficulty design.
- [`docs/SECURITY.md`](docs/SECURITY.md) — Auth, password handling, RLS, and data privacy.
- [`docs/MCP.md`](docs/MCP.md) — Agent integration for Claude / ChatGPT / Codex.
- [`docs/MOBILE.md`](docs/MOBILE.md) — Capacitor, PWA, and native app build instructions.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Web publishing, CI/CD, and store submission.
- [`PRIVACY.md`](PRIVACY.md) — Draft privacy policy for store listings.
- [`TERMS.md`](TERMS.md) — Draft terms of service.

---

## CI/CD

Every push to `main` or `master` triggers `.github/workflows/ci.yml`:

1. Installs dependencies with Bun.
2. Type-checks via `bun run build`.
3. Runs ESLint.
4. Builds the production web bundle.
5. Syncs the Capacitor Android project.
6. Syncs the Capacitor iOS project on macOS.

Artifacts (`dist`, `android`, `ios`) are uploaded for later deployment steps.

---

## Contributing

This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history (force pushes, rebasing, or squashing already-pushed commits) because Lovable's two-way sync depends on a linear, shared history.

See [`AGENTS.md`](AGENTS.md) for the Lovable-specific guidance.

---

## License

Copyright © ChromaWeave. All rights reserved.

This repository contains the source code for the ChromaWeave application. Distribution and reuse terms are governed by [`TERMS.md`](TERMS.md).
