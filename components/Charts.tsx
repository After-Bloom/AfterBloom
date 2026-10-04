"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Checkin } from "@/lib/store";
import { loc } from "@/lib/locale";
import { useTr } from "@/lib/i18n";

const short = (d: string) => new Date(d).toLocaleDateString(loc.v, { day: "numeric", month: "short" });

export function TrendChart({ data, height = 220 }: { data: Pick<Checkin, "date" | "mood" | "appetite" | "sleepHours">[]; height?: number }) {
  const tr = useTr();
  const rows = [...data].sort((a, b) => a.date.localeCompare(b.date)).map((c) => ({ day: short(c.date), mood: c.mood, appetite: c.appetite, sleep: c.sleepHours }));
  if (!rows.length) return <p className="text-sm text-gray-500">{tr("No check-ins yet.")}</p>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f9d9cd" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 8]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line name={tr("Mood")} type="monotone" dataKey="mood" stroke="#5a1a33" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line name={tr("Appetite")} type="monotone" dataKey="appetite" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
          <Line name={tr("Sleep (h)")} type="monotone" dataKey="sleep" stroke="#0e7490" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BpChart({ data }: { data: Pick<Checkin, "date" | "bp">[] }) {
  const tr = useTr();
  const rows = data.filter((c) => c.bp).map((c) => ({ day: short(c.date), upper: c.bp!.sys, lower: c.bp!.dia }));
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: -20, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f9d9cd" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis domain={[50, 180]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={160} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "160", fontSize: 10 }} />
          <Line name={tr("Upper")} dataKey="upper" stroke="#5a1a33" strokeWidth={2} />
          <Line name={tr("Lower")} dataKey="lower" stroke="#0e7490" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
