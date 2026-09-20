import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.chromoweave.game",
  appName: "ChromoWeave",
  webDir: "dist",
  // Load the published web app inside the native wrapper. This lets you ship
  // web updates instantly without waiting for app-store review. To switch to
  // fully offline local assets, remove `server.url` and ensure `dist/index.html`
  // boots the TanStack Start client shell.
  server: {
    url: "https://chromoweave.lovable.app",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0F0F16",
      androidSplashResourceName: "splash",
      iosSplashResourceName: "splash",
    },
  },
};

export default config;
