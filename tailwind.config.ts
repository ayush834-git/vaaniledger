import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#FFFBF0",
        surface: "#FFF5D6",
        "surface-2": "#FFE8B0",
        accent: "#FF5500",
        secondary: "#D4006A",
        income: "#00A86B",
        expense: "#E8003D",
        textPrimary: "#1A0A00",
        textSecondary: "#6B4423",
        border: "rgba(255, 85, 0, 0.12)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 24px rgba(255, 85, 0, 0.08)",
        glow: "0 4px 16px rgba(255, 85, 0, 0.35)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;