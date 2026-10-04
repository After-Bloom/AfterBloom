"use client";
import * as m from "motion/react-m";
import type { MotionValue } from "motion/react";

// Eight outer + eight inner petals. Angles are signed so the closed bud is symmetric.
const OUTER = [-157.5, -112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5];
const INNER = [-135, -90, -45, 0, 45, 90, 135, 180];
const css = (o: Record<string, unknown>) => o as React.CSSProperties;

/** Petals around (0,0). Reads --b (0 bud, 1 open) from an ancestor. */
export function BloomShape() {
  return (
    <g id="bloom-shape">
      <defs>
        <linearGradient id="ab-petal" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#E58A93" /><stop offset="1" stopColor="#F9C9C0" /></linearGradient>
        <linearGradient id="ab-petal-in" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#F2A7A0" /><stop offset="1" stopColor="#FFE3D6" /></linearGradient>
      </defs>
      {OUTER.map((a) => (
        <g key={a} className="bloom-petal" style={css({ "--a": a })}><ellipse cx="0" cy="-30" rx="13" ry="30" fill="url(#ab-petal)" /></g>
      ))}
      {INNER.map((a) => (
        <g key={a} className="bloom-petal" style={css({ "--a": a })}><ellipse cx="0" cy="-19" rx="9" ry="19" fill="url(#ab-petal-in)" opacity=".95" /></g>
      ))}
      <g className="bloom-core"><circle r="11" fill="#F2C36B" /><circle r="5" fill="#E0A63B" /></g>
    </g>
  );
}

/** A standalone flower with stem. `progress` 0..1 drives the opening; omit for fully open. */
export function Bloom({ progress, className = "", label }: { progress?: MotionValue<number>; className?: string; label?: string }) {
  const style = progress ? css({ "--b": progress }) : css({ "--b": 1 });
  return (
    <m.svg viewBox="-72 -78 144 214" className={className} style={style} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M0 6 C-3 50 3 88 0 134" stroke="#7A9A80" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M0 96 C-26 92 -42 78 -46 56 C-22 56 -4 72 0 96Z" fill="#8DB496" />
      <path d="M0 74 C24 70 40 56 44 36 C22 38 4 52 0 74Z" fill="#A9C9AE" />
      <BloomShape />
    </m.svg>
  );
}
