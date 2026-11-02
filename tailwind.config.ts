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
          950: "rgb(var(--c-obsidian-950) / <alpha-value>)",
          900: "rgb(var(--c-obsidian-900) / <alpha-value>)",
          850: "rgb(var(--c-obsidian-850) / <alpha-value>)",
          800: "rgb(var(--c-obsidian-800) / <alpha-value>)",
          700: "rgb(var(--c-obsidian-700) / <alpha-value>)",
          600: "rgb(var(--c-obsidian-600) / <alpha-value>)",
        },
        electric: {
          300: "rgb(var(--c-electric-300) / <alpha-value>)",
          400: "rgb(var(--c-electric-400) / <alpha-value>)",
          500: "rgb(var(--c-electric-500) / <alpha-value>)",
          600: "rgb(var(--c-electric-600) / <alpha-value>)",
        },
        aura: {
          300: "rgb(var(--c-aura-300) / <alpha-value>)",
          400: "rgb(var(--c-aura-400) / <alpha-value>)",
          500: "rgb(var(--c-aura-500) / <alpha-value>)",
          600: "rgb(var(--c-aura-600) / <alpha-value>)",
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
        "cyan-glow": "var(--shadow-cyan-glow)",
        "violet-glow": "var(--shadow-violet-glow)",
        "card-elevated": "var(--shadow-card-elevated)",
        "book-closed":
          "-18px 34px 68px rgba(0, 0, 0, 0.82), 0 0 54px -10px rgba(0, 229, 255, 0.24), 0 0 72px -14px rgba(139, 92, 246, 0.28)",
        "book-open": "var(--shadow-book-open)",
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
