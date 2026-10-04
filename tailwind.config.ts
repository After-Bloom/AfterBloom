import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // soft blush / rose / maroon palette (kept under the "plum" name so existing classes follow)
        plum: { 50: "#fff8f3", 100: "#fdeee4", 200: "#f9d9cd", 300: "#f1b9b3", 400: "#e69a9a", 500: "#dc8082", 600: "#d4707a", 700: "#c85d68", 800: "#5a1a33", 900: "#3d1226" },
        ink: "#3b1f2b",
      },
      fontFamily: { serif: ["var(--font-serif)", "var(--font-deva-serif)", "Georgia", "serif"], sans: ["var(--font-sans)", "var(--font-deva)", "system-ui", "sans-serif"] },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        twinkle: { "0%,100%": { opacity: ".35", transform: "scale(.8) rotate(0)" }, "50%": { opacity: "1", transform: "scale(1.15) rotate(20deg)" } },
        sway: { "0%,100%": { transform: "rotate(-2deg)" }, "50%": { transform: "rotate(2.5deg)" } },
      },
      animation: { fadeUp: "fadeUp .55s ease both", float: "float 6s ease-in-out infinite", twinkle: "twinkle 3s ease-in-out infinite", sway: "sway 7s ease-in-out infinite" },
    },
  },
  plugins: [],
} satisfies Config;
