## Active QA pass
- [ ] Test gameplay, tutorial, settings, persistence, and all navigation states.
- [ ] Test account entry and password-reset flows without creating test data.
- [ ] Test desktop, phone, and tablet layouts plus keyboard accessibility.
- [ ] Run static checks and focused production-security review.
- [ ] Fix verified defects and re-test affected flows.

# ChromoWeave Roadmap

## In progress
- [x] Define the ChromoWeave Woven Prism brand system: logo, typography, color palette, motion, and voice
- [ ] Plan the web-first gameplay expansion: new mechanics, levels, progression, and collaborations
- [ ] Validate the expanded web experience before adapting it for Android and iOS
- [ ] Remove `.env` from the public GitHub repo (`.env` is now ignored locally)
- [ ] Verify repo CI passes after the next Lovable sync
- [ ] Remove the old Namecheap parking CNAME for `www.chromoweave.com` and allow DNS to propagate

## Completed
- [x] Removed ambient background music while preserving button, tile, swap, and completion sound effects
- [x] Restricted profile visibility to each signed-in account owner and ran a fresh security scan
- [x] Requested production publishing at `https://chromoweave.app`
- [x] Core ChromoWeave puzzle game with 12 levels and 3 difficulty groups
- [x] Light/dark theme + first-play tutorial
- [x] Goal gradient preview and progressive difficulty
- [x] Supabase Auth (email/password + Google OAuth) with RLS-secured profiles/progress
- [x] Interaction sound effects and haptics
- [x] PWA support + Capacitor Android/iOS scaffold
- [x] GitHub Actions CI/CD workflow (typecheck, lint, build, mobile sync)
- [x] OAuth-protected MCP agent integration (`/mcp`)
- [x] Comprehensive repository documentation (README, architecture, levels, security, MCP, mobile, deployment, privacy, terms)
- [x] GitHub sync connected and pushed to `https://github.com/DarbhaPreetham/gradient-flow-lab`
- [x] Connected `chromoweave.app`, `www.chromoweave.app`, and `chromoweave.com`; `.app` is primary
