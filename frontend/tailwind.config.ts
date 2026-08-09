import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        proof: {
          obsidian: "#0B0D12",
          carbon: "#121620",
          border: "#1E2638",
          amber: "#FFB020",
          cyan: "#00E5FF",
          emerald: "#10B981",
          ash: "#8E9BB0",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        border: "var(--border)",
        github: {
          DEFAULT: "#2da44e",
          hover: "#2c974b",
          dark: "#238636",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-cyan": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)" },
          "50%": { opacity: "0.5", boxShadow: "0 0 25px rgba(0, 229, 255, 0.8)" },
        },
        "pulse-amber": {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 8px rgba(255, 176, 32, 0.6))" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 18px rgba(255, 176, 32, 0.9))" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        ticker: "ticker 25s linear infinite",
        "pulse-cyan": "pulse-cyan 3s infinite",
        "pulse-amber": "pulse-amber 2.5s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(0, 229, 255, 0.3)",
        "glow-lg": "0 0 50px -10px rgba(0, 229, 255, 0.4)",
        "glow-amber": "0 0 30px -5px rgba(255, 176, 32, 0.35)",
        "glow-github": "0 0 25px -5px rgba(45, 164, 78, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
