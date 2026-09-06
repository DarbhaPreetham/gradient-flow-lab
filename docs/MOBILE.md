# ChromaWeave Mobile Guide

ChromaWeave is a web app first, but it can run as a PWA and as wrapped native apps on Android and iOS via Capacitor.

---

## Progressive Web App (PWA)

The PWA is already configured:

- `public/manifest.webmanifest` — app metadata, icons, theme colors.
- `public/icons/` — 192×192, 512×512, and maskable icons.
- Service-worker behavior and offline support depend on the hosting platform.

Users can "Add to Home Screen" from the published URL:

```text
https://gradient-flow-lab.lovable.app
```

---

## Native Android & iOS

Native projects are generated under `android/` and `ios/` using Capacitor 8.

### Configuration

`capacitor.config.ts`:

```ts
{
  appId: "app.chromaweave.game",
  appName: "ChromaWeave",
  webDir: "dist",
  server: {
    url: "https://gradient-flow-lab.lovable.app",
    cleartext: false,
  },
}
```

The `server.url` setting means the native wrapper loads the **published web app** at runtime. This lets you push web updates instantly without waiting for app-store review. The wrapper requires an internet connection.

To switch to fully offline local assets, remove `server.url` and ensure `dist/index.html` boots the TanStack Start client shell.

### Local development

```bash
# Build the web bundle
bun run build

# Sync web assets into native projects
bun run capacitor:sync

# Open Android Studio
bun run capacitor:open:android

# Open Xcode (macOS only)
bun run capacitor:open:ios
```

### Build requirements

- **Android:** Android Studio, Android SDK, JDK 17+.
- **iOS:** macOS, Xcode 15+, Apple Developer account for device/testing distribution.

### Store submission checklist

- [ ] Privacy policy URL (host [`PRIVACY.md`](../PRIVACY.md) on your domain).
- [ ] Terms / EULA URL (host [`TERMS.md`](../TERMS.md)).
- [ ] App icons and screenshots for each store.
- [ ] Age rating and content disclosure.
- [ ] COPPA / GDPR / CCPA compliance review if targeting children or EU users.
- [ ] Google Play Developer account ($25 one-time).
- [ ] Apple Developer Program ($99/year).

---

## CI mobile sync

`.github/workflows/ci.yml` validates that the Capacitor projects still sync cleanly on every push to `main`:

- Android job runs on Ubuntu.
- iOS sync job runs on macOS.

Actual signed APK/IPA builds require store credentials and are not performed in this repository by default.
