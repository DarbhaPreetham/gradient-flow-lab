import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.chromaweave.game",
  appName: "ChromaWeave",
  webDir: "dist",
  server: {
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
