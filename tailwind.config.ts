import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#211A36",
        deep: "#40345C",
        lavender: "#8D78B5",
        blush: "#E8B9D0",
        cloud: "#F4EAF5",
        lilac: "#C9BCE8",
        cream: "#F8E8D8"
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        romance: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dmsans)", "system-ui", "sans-serif"],
        hand: ["var(--font-caveat)", "cursive"]
      },
      borderRadius: { card: "20px" },
      boxShadow: {
        glow: "0 0 40px rgba(232,185,208,0.25)",
        soft: "0 10px 40px rgba(10,6,24,0.35)"
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        spin: { to: { transform: "rotate(360deg)" } },
        pulseGlow: { "0%,100%": { opacity: "0.5" }, "50%": { opacity: "1" } }
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        vinyl: "spin 6s linear infinite",
        glow: "pulseGlow 3s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
export default config;
