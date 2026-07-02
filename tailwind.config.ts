import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4A9EFF",
          dark: "#3A7FD4",
          light: "#6DB5FF",
        },
        accent: {
          DEFAULT: "#FF6B35",
          dark: "#E55A2B",
          light: "#FF8C60",
        },
        surface: {
          DEFAULT: "#0A0A0B",
          card: "#141416",
          border: "#1F1F22",
          hover: "#1C1C1F",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A1AA",
          muted: "#71717A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-brand": "pulseBrand 2s ease-in-out infinite",
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        pulseBrand: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(74, 158, 255, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(74, 158, 255, 0)" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
