import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  "https://app.getagricore.com";

const isCleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.agricore.app",
  appName: "AgriCore",
  webDir: "native-shell",

  // AgriCore currently relies on the deployed Next.js application for
  // authenticated server routes and APIs. Keep this HTTPS in release builds.
  server: {
    url: serverUrl,
    cleartext: isCleartext,
    errorPath: "native-error.html",
  },

  appendUserAgent: " AgriCoreMobile/1.0",

  android: {
    allowMixedContent: false,
    loggingBehavior: "production",
    backgroundColor: "#071d18",
  },

  ios: {
    loggingBehavior: "production",
    backgroundColor: "#071d18",
    allowsLinkPreview: false,
  },

  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
    },
  },
};

export default config;
