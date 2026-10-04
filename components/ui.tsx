"use client";
import React from "react";
import { Level } from "@/lib/symptoms";
import { loc } from "@/lib/locale";
import { useTr } from "@/lib/i18n";

export function PageHead({ title, sub, tag }: { title: string; sub?: string; tag?: string }) {
  const tr = useTr();
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl md:text-5xl font-semibold">{tr(title)}</h1>
        {tag && <span className="text-[10px] uppercase tracking-wide bg-plum-100 text-plum-700 rounded-full px-2 py-0.5 font-semibold">{tr(tag)}</span>}
      </div>
      {sub && <p className="text-plum-900/70 mt-1">{tr(sub)}</p>}
    </div>
  );
}

export const LEVEL_STYLE: Record<Level, { bg: string; text: string; border: string; label: string; dot: string }> = {
  RED: { bg: "bg-red-50", text: "text-red-800", border: "border-red-300", label: "Go to hospital now", dot: "bg-red-600" },
  AMBER: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-300", label: "See a doctor within 24 hours", dot: "bg-amber-500" },
  GREEN: { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-300", label: "Normal recovery", dot: "bg-emerald-500" },
};

export function LevelBadge({ level }: { level: Level }) {
  const tr = useTr();
  const l = LEVEL_STYLE[level];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${l.bg} ${l.text} ${l.border}`}><span className={`h-2 w-2 rounded-full ${l.dot}`} />{tr(level)}</span>;
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  const tr = useTr();
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`chip whitespace-nowrap ${value === t.id ? "chip-on" : ""}`}>{tr(t.label)}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (b: boolean) => void; label: string; hint?: string }) {
  const tr = useTr();
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 text-left py-2" role="switch" aria-checked={on}>
      <span><span className="font-medium block">{tr(label)}</span>{hint && <span className="text-sm text-plum-900/60">{tr(hint)}</span>}</span>
      <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${on ? "bg-plum-700" : "bg-gray-300"}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} /></span>
    </button>
  );
}

export function Soon({ children }: { children: string }) {
  const tr = useTr();
  return <div className="rounded-2xl border border-dashed border-plum-300 bg-plum-50 p-4 text-sm text-plum-800"><b>{tr("Planned next:")} </b>{tr(children)}</div>;
}

export function Disclaimer({ children }: { children?: string }) {
  const tr = useTr();
  return <p className="text-xs text-plum-900/60 mt-3">{tr(children ?? "AfterBloom offers screening support and care navigation, not a diagnosis. In an emergency call 112.")}</p>;
}

export const fmtDate = (d: string) => new Date(d).toLocaleDateString(loc.v, { day: "numeric", month: "short" });
export const fmtTime = (d: string) => new Date(d).toLocaleString(loc.v, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
