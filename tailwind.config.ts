import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Noto Sans JP",
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Primary brand — refined indigo / iris. Trustworthy for finance,
        // sophisticated for the beauty industry.
        // Brand teal — sampled from the Salon One logo. Bright enough at 500/600
        // to feel premium and "not too dark", deep at 900/950 to match the mark.
        brand: {
          50: "#eef9f7",
          100: "#d4f1ec",
          200: "#ace3da",
          300: "#76cebf",
          400: "#3eb3a3",
          500: "#1b9587",
          600: "#0f766e",
          700: "#0d5d57",
          800: "#114a46",
          900: "#103d3a",
          950: "#04211f",
        },
        // Premium gold accent — used sparingly for highlights / premium tiers.
        // Champagne gold — the logo accent (#c0a060 ≈ 400/500).
        gold: {
          50: "#faf7ee",
          100: "#f4ecd0",
          200: "#e9d8a2",
          300: "#dcc274",
          400: "#cdac50",
          500: "#c0a060",
          600: "#9e7e30",
          700: "#7e6329",
          800: "#684f27",
          900: "#574323",
        },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
        card: "0 1px 3px rgba(16,24,40,.05), 0 1px 2px rgba(16,24,40,.03)",
        pop: "0 12px 32px -12px rgba(16,24,40,.22)",
        focus: "0 0 0 4px rgba(15,118,110,.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "ring-draw": {
          "0%": { "stroke-dashoffset": "1" },
          "100%": { "stroke-dashoffset": "0" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s cubic-bezier(.16,1,.3,1) both",
        "fade-up": "fade-up .5s cubic-bezier(.16,1,.3,1) both",
        "scale-in": "scale-in .5s cubic-bezier(.16,1,.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
