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
        brand: {
          50: "#eef1ff",
          100: "#e0e4ff",
          200: "#c6ccff",
          300: "#a3acfd",
          400: "#7f87f8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        // Premium gold accent — used sparingly for highlights / premium tiers.
        gold: {
          50: "#fbf7ed",
          100: "#f6ecd2",
          200: "#ecd6a0",
          300: "#e1bd6a",
          400: "#d8a544",
          500: "#c98b2c",
          600: "#a96d23",
          700: "#875221",
          800: "#704321",
          900: "#5f3920",
        },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
        card: "0 1px 3px rgba(16,24,40,.05), 0 1px 2px rgba(16,24,40,.03)",
        pop: "0 12px 32px -12px rgba(16,24,40,.22)",
        focus: "0 0 0 4px rgba(99,102,241,.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s cubic-bezier(.16,1,.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
