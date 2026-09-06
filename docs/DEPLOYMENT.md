# ChromaWeave Deployment Guide

This guide covers web publishing, CI/CD, and the path to native store distribution.

---

## Web deployment

### Lovable Publish (recommended)

The fastest way to go live is Lovable's built-in publish flow:

1. Click **Publish** in the Lovable editor.
2. Lovable builds and deploys to the edge network.
3. Your published URL: `https://gradient-flow-lab.lovable.app`

### Custom domain

Recommended domain: `chromaweave.app`

To connect it:

1. Purchase the domain through your registrar.
2. In Lovable, go to **Project Settings → Domains** and follow the DNS instructions.
3. Update `capacitor.config.ts` `server.url` if you want native wrappers to load the custom domain.

---

## CI/CD pipeline

`.github/workflows/ci.yml` runs on every push/PR to `main` or `master`:

| Job | Runner | Steps |
|-----|--------|-------|
| `web` | `ubuntu-latest` | install → typecheck (`bun run build`) → lint → build → upload `dist` |
| `android` | `ubuntu-latest` | install → build → `cap sync android` → upload `android` |
| `ios` | `macos-latest` | install → build → `cap sync ios` → upload `ios` |

### Extending CI to deploy

You can add a deploy job that:

1. Downloads the `dist` artifact.
2. Uploads it to Lovable, Cloudflare Pages, Vercel, Netlify, or any static host.
3. Invalidates CDN cache.

Because TanStack Start is full-stack, verify that your host supports the server functions and API routes used by the app.

---

## Native deployment

### Android

1. Open `android/` in Android Studio.
2. Generate a signed release APK/AAB using your keystore.
3. Upload the AAB to Google Play Console.

### iOS

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Set your Team, Bundle ID, and signing certificates.
3. Archive and upload to App Store Connect.

See [`docs/MOBILE.md`](MOBILE.md) for detailed native setup.

---

## Environment for production

Ensure these variables are set in your production environment (managed by Lovable Cloud):

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Never commit `.env` to version control.

---

## Pre-launch checklist

- [ ] Build passes: `bun run build`
- [ ] Lint passes: `bun run lint`
 [ ] PWA icons and manifest are present.
- [ ] Privacy policy and Terms pages are hosted and linked.
- [ ] Google OAuth provider is configured in Lovable Cloud.
- [ ] Email provider is configured for password-reset emails.
- [ ] Custom domain is connected and HTTPS is enforced.
- [ ] Analytics and crash reporting are added (optional).
- [ ] App store assets (screenshots, descriptions) are prepared.
