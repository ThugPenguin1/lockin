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
        lockin: {
          bg: "#0a0a0f",
          card: "#12121a",
          border: "#1e1e2e",
          primary: "#6c5ce7",
          "primary-light": "#a29bfe",
          secondary: "#00cec9",
          accent: "#fd79a8",
          success: "#00b894",
          warning: "#fdcb6e",
          danger: "#e17055",
          text: "#f0f0f5",
          "text-muted": "#8e8ea0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(108, 92, 231, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(108, 92, 231, 0.6)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
