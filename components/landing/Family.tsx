"use client";
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";
import { useTr } from "@/lib/i18n";

// Mother, partner and elder as soft avatars; the connecting lines draw in once on scroll.
const draw = (reduce: boolean, delay: number) => ({
  initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: reduce ? 0 : 1.2, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function Family() {
  const tr = useTr();
  const reduce = !!useReducedMotion();
  const line = { stroke: "rgb(var(--primary))", strokeWidth: 3, fill: "none", strokeLinecap: "round" as const, strokeDasharray: "1 8" };
  return (
    <svg viewBox="0 0 360 248" className="mx-auto h-auto w-full max-w-md" role="img" aria-label={tr("Mother, partner and elder connected around her")}>
      <m.path d="M180 96 C150 120 112 140 84 168" {...line} {...draw(reduce, 0.1)} />
      <m.path d="M180 96 C210 120 248 140 276 168" {...line} {...draw(reduce, 0.3)} />
      <m.path d="M104 196 C150 214 210 214 256 196" {...line} {...draw(reduce, 0.5)} />

      {/* mother */}
      <g transform="translate(180 62)">
        <circle r="38" style={{ fill: "rgb(var(--plum-200))" }} />
        <path d="M-26 -4 C-30 -40 30 -40 26 -4 C22 -26 -22 -26 -26 -4Z" fill="#F1B9B3" stroke="#E0A63B" strokeWidth="1.5" />
        <circle cy="2" r="20" fill="#EBB896" />
        <path d="M-9 2 q4 4 8 0 M3 2 q4 4 8 0" stroke="#5A3340" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cy="-12" r="2.2" fill="#C0392B" />
      </g>
      {/* partner */}
      <g transform="translate(70 186)">
        <circle r="34" style={{ fill: "rgb(var(--plum-100))" }} />
        <path d="M-17 -6 C-18 -30 18 -30 17 -6 C10 -16 -10 -16 -17 -6Z" fill="#3B1F2B" />
        <circle cy="2" r="18" fill="#E3A987" />
        <path d="M-8 2 q4 4 8 0 M2 2 q4 4 8 0" stroke="#5A3340" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M-6 12 q6 4 12 0" stroke="#B04A56" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* elder */}
      <g transform="translate(290 186)">
        <circle r="34" style={{ fill: "rgb(var(--plum-100))" }} />
        <circle cy="-24" r="9" fill="#C9C2C5" />
        <path d="M-18 -4 C-19 -30 19 -30 18 -4 C10 -16 -10 -16 -18 -4Z" fill="#D8D2D5" />
        <circle cy="2" r="18" fill="#E3A987" />
        <path d="M-8 2 q4 4 8 0 M2 2 q4 4 8 0" stroke="#5A3340" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M-14 24 C-8 32 8 32 14 24" stroke="#E0A63B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      <g fontSize="13" fontWeight="700" textAnchor="middle" style={{ fill: "rgb(var(--ink-muted))" }}>
        <text x="180" y="13" style={{ fill: "rgb(var(--ink))" }}>{tr("Mother")}</text>
        <text x="70" y="238">{tr("Partner")}</text>
        <text x="290" y="238">{tr("Elder")}</text>
      </g>
    </svg>
  );
}
