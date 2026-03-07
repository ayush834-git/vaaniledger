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
        bg: "#FDFAF8",
        surface: "#FFFFFF",
        "surface-2": "#F8F6F4",
        accent: "#FF5500",
        secondary: "#D4006A",
        income: "#00A86B",
        expense: "#E8003D",
        textPrimary: "#111111",
        textSecondary: "#6B6B6B",
        border: "rgba(255, 85, 0, 0.12)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        resting: "0 1px 4px rgba(0,0,0,0.06)",
        hover: "0 4px 16px rgba(255,85,0,0.08)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;