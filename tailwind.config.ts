import type { Config } from "tailwindcss";

// Colours are CSS variables (RGB channels) defined in app/globals.css so light/dark switch
// without re-rendering. See design-system/afterbloom/MASTER.md.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: v("background"),
        surface: v("surface"),
        "surface-2": v("surface-2"),
        line: v("line"),
        ink: { DEFAULT: v("ink"), muted: v("ink-muted") },
        primary: { DEFAULT: v("primary"), strong: v("primary-strong"), fill: v("primary-fill"), on: v("on-primary") },
        accent: v("accent"),
        gold: v("gold"),
        danger: v("danger"),
        warn: v("warn"),
        ok: v("ok"),
        // legacy alias: existing pages use plum-*, which now follows light/dark
        plum: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, v(`plum-${n}`)])),
      },
      fontFamily: {
        serif: ["var(--font-serif)", "var(--font-deva-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "var(--font-deva)", "system-ui", "sans-serif"],
      },
      borderRadius: { control: "16px", card: "24px", sheet: "28px" },
      boxShadow: {
        soft: "0 10px 30px -14px rgb(var(--shadow) / .28)",
        lift: "0 18px 40px -14px rgb(var(--shadow) / .38)",
        sheet: "0 -12px 40px -12px rgb(var(--shadow) / .35)",
      },
      spacing: { nav: "4rem" },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        twinkle: { "0%,100%": { opacity: ".35", transform: "scale(.8) rotate(0)" }, "50%": { opacity: "1", transform: "scale(1.15) rotate(20deg)" } },
        sway: { "0%,100%": { transform: "rotate(-2deg)" }, "50%": { transform: "rotate(2.5deg)" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-8px)" }, "75%": { transform: "translateX(8px)" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        breathe: { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.016)" } },
        dupatta: { "0%,100%": { transform: "rotate(-1.1deg)" }, "50%": { transform: "rotate(1.3deg)" } },
        drift: { "0%": { opacity: "0", transform: "translate(0,0) rotate(0deg)" }, "12%": { opacity: ".85" }, "85%": { opacity: ".7" }, "100%": { opacity: "0", transform: "translate(var(--dx), var(--dy)) rotate(var(--rot))" } },
      },
      animation: {
        fadeUp: "fadeUp .55s ease both",
        float: "float 6s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        sway: "sway 7s ease-in-out infinite",
        shake: "shake .35s ease-in-out",
        fadeIn: "fadeIn .2s ease both",
        breathe: "breathe 7s ease-in-out infinite",
        dupatta: "dupatta 6s ease-in-out infinite",
        drift: "drift var(--dur, 14s) linear var(--delay, 0s) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
