/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 深空背景
        space: {
          900: "#050810",
          800: "#0A0E1A",
          700: "#111622",
          600: "#1A1F2E",
          500: "#252B3D",
        },
        // 霓虹强调色
        neon: {
          cyan: "#00E5FF",
          blue: "#0EA5E9",
          purple: "#A855F7",
          green: "#00D9A3",
          orange: "#FF6B35",
          red: "#FF4757",
          yellow: "#FFD93D",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        sans: ['"HarmonyOS Sans"', '"PingFang SC"', '"Noto Sans SC"', "sans-serif"],
      },
      boxShadow: {
        "neon-cyan": "0 0 20px rgba(0, 229, 255, 0.35), 0 0 40px rgba(0, 229, 255, 0.15)",
        "neon-orange": "0 0 20px rgba(255, 107, 53, 0.35)",
        "neon-green": "0 0 20px rgba(0, 217, 163, 0.35)",
        "neon-red": "0 0 20px rgba(255, 71, 87, 0.35)",
        "card": "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "pulse-dot": "pulse-dot 1.5s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.3s ease-out",
        "scan": "scan 3s linear infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(0, 229, 255, 0.3)" },
          "50%": { boxShadow: "0 0 24px rgba(0, 229, 255, 0.6)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};
