import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.deepseek.monitor",
  appName: "DeepSeek Monitor",
  webDir: "dist",
  backgroundColor: "#050810",
  android: {
    backgroundColor: "#050810",
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#050810",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#050810",
      overlaysWebView: true,
    },
  },
};

export default config;
