import type { Config } from "tailwindcss";

// Warm-only palette. No blue anywhere — not even in text or loading states.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm grays for text (white carries blue, so we never use it).
        ash: {
          DEFAULT: "#cdbfb3",
          dim: "#8a7d72",
          faint: "#5c5248",
        },
        // Warm amber/red accents.
        ember: {
          core: "#ff8a52",
          mid: "#f4502a",
          deep: "#b3261a",
          label: "#e09a7a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
