"use client";
import * as m from "motion/react-m";
import { MotionValue, useMotionValue, useTransform } from "motion/react";
import { BloomShape } from "./Bloom";

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
};

export function Illustration({ p, idle, still = false, label }: Props) {
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
        <circle cx="200" cy="270" r="190" style={{ fill: "rgb(var(--plum-100))" }} />
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

      <m.g id="figure" style={{ y: figY }} clipPath="url(#ab-badge)">
        <g className={`${loop}animate-breathe origin-fill-bottom`}>
          <g id="mother">
            <path d="M96 460 C96 388 132 336 200 326 C268 336 304 388 304 460Z" fill="url(#ab-kurta)" />
            <path d="M176 331 Q200 354 224 331" stroke="#E0A63B" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M187 298 L187 324 Q200 334 213 324 L213 298Z" fill="#E3A987" />
            <path d="M160 266 C154 214 246 214 240 266 C238 304 162 304 160 266Z" fill="#3B1F2B" />
            <ellipse cx="200" cy="270" rx="36" ry="42" fill="#EBB896" />
            <path d="M184 270 q6 6 12 0 M204 270 q6 6 12 0" stroke="#5A3340" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M193 292 q7 6 14 0" stroke="#B04A56" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <circle cx="177" cy="284" r="6" fill="#F2A7A0" opacity=".5" /><circle cx="223" cy="284" r="6" fill="#F2A7A0" opacity=".5" />
            <circle cx="200" cy="249" r="3.2" fill="#C0392B" />
            <path d="M112 446 C128 392 168 380 214 396 C262 410 286 424 292 446 C250 462 150 466 112 446Z" fill="#A83E4B" />
          </g>

          <g id="baby">
            <path d="M158 410 C156 372 214 356 256 372 C282 384 286 420 262 436 C230 452 164 446 158 410Z" fill="url(#ab-swaddle)" />
            <path d="M170 402 C200 388 232 386 268 398" stroke="#E0A63B" strokeWidth="2" fill="none" opacity=".7" strokeLinecap="round" />
            <circle cx="246" cy="378" r="21" fill="#F0C4A4" />
            <path d="M233 364 q13 -9 26 0" stroke="#3B1F2B" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M238 380 q4 4 8 0 M250 380 q4 4 8 0" stroke="#5A3340" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx="235" cy="388" r="4" fill="#F2A7A0" opacity=".55" /><circle cx="259" cy="388" r="4" fill="#F2A7A0" opacity=".55" />
            <ellipse cx="274" cy="428" rx="14" ry="10" fill="#EBB896" /><ellipse cx="150" cy="436" rx="14" ry="10" fill="#EBB896" />
          </g>

          <g id="dupatta" className={`${loop}animate-dupatta origin-fill-top`}>
            <path d="M154 272 C146 198 254 198 246 272 C240 236 160 236 154 272Z" fill="url(#ab-dupatta)" stroke="#E0A63B" strokeWidth="2" />
            <path d="M156 282 C134 302 116 354 104 442 L132 454 C140 394 160 348 188 328Z" fill="url(#ab-dupatta)" stroke="#E0A63B" strokeWidth="2" />
            <path d="M244 282 C266 302 284 354 296 442 L268 454 C260 394 240 348 212 328Z" fill="url(#ab-dupatta)" stroke="#E0A63B" strokeWidth="2" />
          </g>
        </g>
      </m.g>

      <m.g id="flower" style={{ y: flowerY }}>
        <g transform="translate(336 344)" style={{ "--b": 0.14 } as React.CSSProperties}>
          <path d="M0 6 C-3 40 3 70 0 108" stroke="#7A9A80" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M0 78 C-22 74 -34 62 -38 44 C-18 44 -3 58 0 78Z" fill="#8DB496" />
          <g transform="scale(.62)"><BloomShape /></g>
        </g>
      </m.g>
    </svg>
  );
}
