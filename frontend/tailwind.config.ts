import type { Config } from "tailwindcss";

/**
 * MTÜ kurumsal kimlik referansı:
 * Lacivert #262F59 · Turkuaz #12A7CD · Beyaz
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef8fc",
          100: "#d5eef7",
          200: "#a9dceb",
          300: "#6ec4dc",
          400: "#2eb0d4",
          500: "#12A7CD",
          600: "#0e8fb0",
          700: "#262F59",
          800: "#1e2648",
          900: "#161c36",
        },
        navy: {
          DEFAULT: "#262F59",
          soft: "#2f3a6b",
          deep: "#1a203d",
          muted: "#3d4870",
        },
        accent: {
          DEFAULT: "#12A7CD",
          soft: "#e8f7fb",
          strong: "#0d8eae",
        },
        surface: {
          DEFAULT: "#f4f7fb",
          muted: "#e8eef5",
          card: "#ffffff",
        },
        sidebar: {
          DEFAULT: "#1a203d",
          hover: "#262F59",
          active: "#12A7CD",
          border: "rgba(18,167,205,0.18)",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgb(38 47 89 / 0.04), 0 1px 3px rgb(38 47 89 / 0.06)",
        card: "0 1px 2px rgb(38 47 89 / 0.04), 0 6px 16px rgb(38 47 89 / 0.06)",
        elevated:
          "0 10px 28px rgb(38 47 89 / 0.10), 0 2px 8px rgb(38 47 89 / 0.05)",
        glow: "0 0 0 3px rgb(18 167 205 / 0.22)",
        "sidebar-glow": "0 0 24px rgb(18 167 205 / 0.25)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      maxWidth: {
        content: "1280px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "nav-indicator": {
          "0%": { transform: "scaleY(0.4)", opacity: "0.4" },
          "100%": { transform: "scaleY(1)", opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "toast-progress": {
          "0%": { width: "100%" },
          "100%": { width: "0%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.28s ease-out",
        "slide-up": "slide-up 0.35s ease-out",
        "slide-in-right": "slide-in-right 0.32s ease-out",
        "page-enter": "page-enter 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "nav-indicator": "nav-indicator 0.28s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "toast-progress": "toast-progress 4s linear forwards",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
