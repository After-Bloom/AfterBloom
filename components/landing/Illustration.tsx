"use client";
import * as m from "motion/react-m";
import { MotionValue, useMotionValue, useTransform } from "motion/react";
import { BloomShape } from "./Bloom";
import { Standing } from "./Standing";

// Mother and baby, drawn as separate layered groups so each can move on its own:
// #bg-shapes, #petals, #figure (#mother, #baby, #dupatta), #flower.
// Inline SVG only: no images, no video, no Lottie. Skin and fabric colours are fixed so the
// artwork stays warm in dark mode; background shapes follow the theme tokens.

const PETALS = [
  { x: 70, y: 120, dx: 40, dy: 190, rot: "120deg", dur: "15s", delay: "0s", c: "#F1B9B3" },
  { x: 150, y: 40, dx: -30, dy: 220, rot: "-90deg", dur: "17s", delay: "2.5s", c: "#E69A9A" },
  { x: 250, y: 60, dx: 36, dy: 210, rot: "140deg", dur: "16s", delay: "5s", c: "#F9C9C0" },
  { x: 330, y: 150, dx: -44, dy: 180, rot: "-130deg", dur: "14s", delay: "1.2s", c: "#F1B9B3" },
  { x: 40, y: 250, dx: 50, dy: 150, rot: "100deg", dur: "18s", delay: "7s", c: "#F2C36B" },
  { x: 370, y: 270, dx: -40, dy: 140, rot: "-110deg", dur: "16s", delay: "9s", c: "#E69A9A" },
  { x: 110, y: 190, dx: 30, dy: 160, rot: "80deg", dur: "19s", delay: "4s", c: "#F9C9C0" },
  { x: 290, y: 20, dx: -20, dy: 230, rot: "-70deg", dur: "20s", delay: "11s", c: "#F1B9B3" },
];

type Props = {
  /** story scroll progress 0..1, drives the parallax. Omit for no parallax. */
  p?: MotionValue<number>;
  /** run the idle breathing/sway/petal loops */
  idle: boolean;
  /** reduced motion: no petals, no loops, no parallax */
  still?: boolean;
  label: string;
  /** colour of the soft circle behind her (changes with each stop of the journey) */
  tint?: string;
  /** how open the flower is, 0 bud to 1 bloom */
  flower?: MotionValue<number> | number;
  /** heavy eyes, for the sleepless-nights stop */
  sleepy?: boolean;
};

export function Illustration({ p, idle, still = false, label, tint, flower, sleepy = false }: Props) {
  const zero = useMotionValue(0);
  const src = still || !p ? zero : p;
  const bgY = useTransform(src, [0, 0.4], [0, -26]);
  const petalsY = useTransform(src, [0, 0.4], [0, -70]);
  const figY = useTransform(src, [0, 0.4], [0, -10]);
  const flowerY = useTransform(src, [0, 0.4], [0, -18]);
  const loop = idle && !still ? "idle " : "";

  return (
    <svg viewBox="0 0 400 460" role="img" aria-label={label} className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="ab-kurta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D2707B" /><stop offset="1" stopColor="#B04A56" /></linearGradient>
        <linearGradient id="ab-dupatta" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FAD3CB" /><stop offset="1" stopColor="#E69A9A" /></linearGradient>
        <linearGradient id="ab-swaddle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF6E3" /><stop offset="1" stopColor="#F6DDAE" /></linearGradient>
        <clipPath id="ab-badge"><circle cx="200" cy="270" r="190" /></clipPath>
        <radialGradient id="ab-glow" cx=".5" cy=".42" r=".55"><stop offset="0" stopColor="#FFE9D6" stopOpacity=".95" /><stop offset="1" stopColor="#FFE9D6" stopOpacity="0" /></radialGradient>
      </defs>

      <m.g id="bg-shapes" style={{ y: bgY }}>
        <circle cx="200" cy="270" r="190" style={{ fill: tint ?? "rgb(var(--plum-100))", transition: "fill .8s ease" }} />
        <circle cx="200" cy="270" r="190" fill="url(#ab-glow)" className="dark:opacity-20" />
        <circle cx="332" cy="86" r="46" fill="#8DB496" opacity=".24" />
        <circle cx="60" cy="376" r="34" fill="#F2C36B" opacity=".3" />
        <circle cx="352" cy="400" r="18" style={{ fill: "rgb(var(--plum-300))" }} opacity=".6" />
      </m.g>

      <m.g id="petals" style={{ y: petalsY }} aria-hidden="true">
        {!still && PETALS.map((q, i) => (
          <g key={i} transform={`translate(${q.x} ${q.y})`}>
            <path className={`${loop}animate-drift origin-fill-top`} d="M0 0 C6 -6 14 -2 12 8 C8 14 -2 10 0 0Z" fill={q.c} style={{ "--dx": `${q.dx}px`, "--dy": `${q.dy}px`, "--rot": q.rot, "--dur": q.dur, "--delay": q.delay, opacity: 0 } as React.CSSProperties} />
          </g>
        ))}
      </m.g>

      <m.g id="figure" style={{ y: figY }}>
        <g transform="translate(84 92) scale(1.56)"><Standing sleepy={sleepy} still={still} /></g>
      </m.g>

      <m.g id="flower" style={{ y: flowerY }}>
        <g transform="translate(336 344)">
          <m.g style={{ "--b": flower ?? 0.14 } as React.CSSProperties}>
            <path d="M0 6 C-3 40 3 70 0 108" stroke="#7A9A80" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M0 78 C-22 74 -34 62 -38 44 C-18 44 -3 58 0 78Z" fill="#8DB496" />
            <g transform="scale(.62)"><BloomShape /></g>
          </m.g>
        </g>
      </m.g>
    </svg>
  );
}
