"use client";
import { useTr } from "@/lib/i18n";

/** A small line of the last blood pressure readings (top number). The last reading is dotted, and red if it is raised. */
export function Sparkline({ points }: { points: { sys: number; dia: number }[] }) {
  const tr = useTr();
  if (points.length < 2) return <p className="text-xs text-ink-muted">{tr("Not enough readings for a chart yet.")}</p>;
  const W = 180, H = 52, P = 6;
  const lo = Math.min(...points.map((p) => p.sys), 110), hi = Math.max(...points.map((p) => p.sys), 150);
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - lo) * (H - 2 * P)) / Math.max(1, hi - lo);
  const last = points.at(-1)!;
  const raised = last.sys >= 140 || last.dia >= 90;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="h-14 w-full max-w-[220px]" aria-label={tr("Blood pressure over the last {n} readings: from {a} to {b}", { n: points.length, a: `${points[0].sys}/${points[0].dia}`, b: `${last.sys}/${last.dia}` })}>
      <line x1={P} x2={W - P} y1={y(140)} y2={y(140)} stroke="currentColor" strokeDasharray="3 3" className="text-line" />
      <polyline fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" className="text-primary" points={points.map((p, i) => `${x(i)},${y(p.sys)}`).join(" ")} />
      <circle cx={x(points.length - 1)} cy={y(last.sys)} r="4" className={raised ? "fill-danger" : "fill-ok"} />
    </svg>
  );
}
