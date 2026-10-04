"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import type { Checkin } from "@/lib/store";
import { loc } from "@/lib/locale";
import { useTr } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const short = (d: string) => new Date(d).toLocaleDateString(loc.v, { day: "numeric", month: "short" });

// Recharts needs concrete colours, so the palette is picked per theme (same hues as the tokens).
function useChart() {
  const { dark } = useTheme();
  const reduce = useReducedMotion();
  const c = dark
    ? { grid: "#4A2F3B", tick: "#D6BBBE", mood: "#F0A0AB", appetite: "#FBBF24", sleep: "#8DBF9F", ref: "#F87171", surface: "#2A1A22", ink: "#F8E9E3" }
    : { grid: "#F1DDD2", tick: "#6B4A57", mood: "#B04A56", appetite: "#B45309", sleep: "#4F7A5E", ref: "#B91C1C", surface: "#FFFFFF", ink: "#3B1F2B" };
  return { c, anim: { isAnimationActive: !reduce, animationDuration: 900, animationEasing: "ease-out" as const } };
}
const tip = (c: { surface: string; ink: string; grid: string }) => ({ contentStyle: { background: c.surface, color: c.ink, border: `1px solid ${c.grid}`, borderRadius: 12, fontSize: 12 } });

/** Mood and appetite are 1 to 5 faces; sleep is hours. Lines differ by dash and dot shape, not colour alone. */
export function TrendChart({ data, height = 220 }: { data: Pick<Checkin, "date" | "mood" | "appetite" | "sleepHours">[]; height?: number }) {
  const tr = useTr();
  const { c, anim } = useChart();
  const rows = [...data].sort((a, b) => a.date.localeCompare(b.date)).map((x) => ({ day: short(x.date), mood: x.mood, appetite: x.appetite, sleep: x.sleepHours }));
  if (!rows.length) return <p className="text-sm text-ink-muted">{tr("No check-ins yet.")}</p>;
  return (
    <div style={{ height }} role="img" aria-label={tr("Trend of mood, appetite and sleep over {n} check-ins", { n: rows.length })}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: -22, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} />
          <YAxis domain={[0, 8]} tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} />
          <Tooltip {...tip(c)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line {...anim} name={tr("Mood")} type="monotone" dataKey="mood" stroke={c.mood} strokeWidth={3} dot={{ r: 3.5 }} />
          <Line {...anim} name={tr("Appetite")} type="monotone" dataKey="appetite" stroke={c.appetite} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: c.surface }} />
          <Line {...anim} name={tr("Sleep (h)")} type="monotone" dataKey="sleep" stroke={c.sleep} strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BpChart({ data }: { data: Pick<Checkin, "date" | "bp">[] }) {
  const tr = useTr();
  const { c, anim } = useChart();
  const rows = data.filter((x) => x.bp).map((x) => ({ day: short(x.date), upper: x.bp!.sys, lower: x.bp!.dia }));
  return (
    <div style={{ height: 180 }} role="img" aria-label={tr("Blood pressure readings")}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: -22, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} />
          <YAxis domain={[50, 180]} tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} />
          <Tooltip {...tip(c)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={160} stroke={c.ref} strokeDasharray="4 4" label={{ value: "160", fontSize: 10, fill: c.ref }} />
          <Line {...anim} name={tr("Upper")} dataKey="upper" stroke={c.mood} strokeWidth={2.5} />
          <Line {...anim} name={tr("Lower")} dataKey="lower" stroke={c.sleep} strokeWidth={2.5} strokeDasharray="6 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Professional-facing only: EPDS scores over time with the two cut-offs. The mother never sees this chart. */
export function EpdsChart({ data, possible, probable }: { data: { d: string; score: number }[]; possible: number; probable: number }) {
  const tr = useTr();
  const { c, anim } = useChart();
  return (
    <div style={{ height: 170 }} role="img" aria-label={tr("EPDS scores over time")}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -22, right: 14, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="d" tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} />
          <YAxis domain={[0, 30]} ticks={[0, 10, 13, 20, 30]} tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} />
          <Tooltip {...tip(c)} />
          <ReferenceLine y={possible} stroke={c.appetite} strokeDasharray="4 4" label={{ value: tr("Possible"), fontSize: 10, fill: c.appetite, position: "insideTopLeft" }} />
          <ReferenceLine y={probable} stroke={c.ref} strokeDasharray="4 4" label={{ value: tr("Probable"), fontSize: 10, fill: c.ref, position: "insideTopLeft" }} />
          <Line {...anim} name="EPDS" dataKey="score" stroke={c.mood} strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
