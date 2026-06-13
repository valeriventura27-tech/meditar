import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.meditar.app",
  appName: "meditar",
  // Next.js static export output directory.
  webDir: "out",
  ios: {
    // Pure black background so there is no blue/white flash on launch.
    backgroundColor: "#000000",
    contentInset: "always",
  },
  plugins: {
    // Keep the screen quiet and dark; audio must keep playing when locked.
    // Background audio is enabled via the iOS UIBackgroundModes capability
    // (configured in the native project, see README).
  },
};

export default config;
