import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "380px",
        book: "880px",
      },
      colors: {
        obsidian: {
          950: "#02050E",
          900: "#050B1A",
          850: "#081126",
          800: "#0C1936",
          700: "#13264F",
          600: "#1D376E",
        },
        electric: {
          300: "#67F0FF",
          400: "#00E5FF",
          500: "#00B8D9",
          600: "#0284C7",
        },
        aura: {
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: [
          '"Space Grotesk Variable"',
          '"Space Grotesk"',
          '"Inter Variable"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          '"Cormorant Garamond Variable"',
          '"Cormorant Garamond"',
          "Georgia",
          "Cambria",
          "serif",
        ],
      },
      boxShadow: {
        "cyan-glow":
          "0 0 28px -4px rgba(0, 229, 255, 0.42), 0 0 8px -2px rgba(0, 229, 255, 0.25)",
        "violet-glow":
          "0 0 32px -6px rgba(139, 92, 246, 0.45), 0 0 10px -2px rgba(139, 92, 246, 0.25)",
        "card-elevated":
          "0 24px 60px -16px rgba(2, 5, 14, 0.85), 0 0 0 1px rgba(148, 163, 184, 0.1)",
        "book-closed":
          "-18px 34px 68px rgba(0, 0, 0, 0.82), 0 0 54px -10px rgba(0, 229, 255, 0.24), 0 0 72px -14px rgba(139, 92, 246, 0.28)",
        "book-open":
          "0 38px 90px -12px rgba(0, 0, 0, 0.88), 0 0 65px -14px rgba(0, 229, 255, 0.18), 0 0 85px -18px rgba(139, 92, 246, 0.22)",
      },
      keyframes: {
        floatBook: {
          "0%, 100%": {
            transform: "translateY(0px) rotateX(5deg) rotateY(-14deg)",
          },
          "50%": {
            transform: "translateY(-11px) rotateX(7deg) rotateY(-11deg)",
          },
        },
        shadowBreath: {
          "0%, 100%": {
            transform: "scale(1)",
            opacity: "0.72",
          },
          "50%": {
            transform: "scale(0.91)",
            opacity: "0.48",
          },
        },
        rimPulse: {
          "0%, 100%": {
            opacity: "0.65",
          },
          "50%": {
            opacity: "1",
          },
        },
      },
      animation: {
        "book-float": "floatBook 6.5s ease-in-out infinite",
        "shadow-breath": "shadowBreath 6.5s ease-in-out infinite",
        "rim-pulse": "rimPulse 4.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
