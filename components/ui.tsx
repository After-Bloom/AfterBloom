"use client";
import React from "react";
import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { Level } from "@/lib/symptoms";
import { loc } from "@/lib/locale";
import { useTr } from "@/lib/i18n";

export function PageHead({ title, sub, tag }: { title: string; sub?: string; tag?: string }) {
  const tr = useTr();
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl md:text-5xl font-semibold">{tr(title)}</h1>
        {tag && <span className="text-[10px] uppercase tracking-wide bg-plum-100 text-primary rounded-full px-2 py-0.5 font-semibold">{tr(tag)}</span>}
      </div>
      {sub && <p className="text-ink-muted mt-1">{tr(sub)}</p>}
    </div>
  );
}

// Level is always shown with an icon and a word as well as colour (never colour alone).
export const LEVEL_STYLE: Record<Level, { bg: string; text: string; border: string; label: string; dot: string; icon: typeof OctagonAlert }> = {
  RED: { bg: "bg-danger/10", text: "text-danger", border: "border-danger/50", label: "Go to hospital now", dot: "bg-danger", icon: OctagonAlert },
  AMBER: { bg: "bg-warn/10", text: "text-warn", border: "border-warn/50", label: "See a doctor within 24 hours", dot: "bg-warn", icon: TriangleAlert },
  GREEN: { bg: "bg-ok/10", text: "text-ok", border: "border-ok/50", label: "Normal recovery", dot: "bg-ok", icon: CircleCheck },
};

export function LevelBadge({ level }: { level: Level }) {
  const tr = useTr();
  const l = LEVEL_STYLE[level];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${l.bg} ${l.text} ${l.border}`}><l.icon className="h-3.5 w-3.5" aria-hidden />{tr(level)}</span>;
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

/** Two-to-four option control (radio group). Labels are translated here. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const tr = useTr();
  return (
    <div role="radiogroup" aria-label={tr(label)} className="flex rounded-full border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`min-h-[44px] flex-1 rounded-full px-4 text-sm font-bold transition ${value === o.id ? "bg-primary-fill text-primary-on shadow" : "text-plum-800 hover:bg-plum-100"}`}>{tr(o.label)}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (b: boolean) => void; label: string; hint?: string }) {
  const tr = useTr();
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 text-left py-2" role="switch" aria-checked={on}>
      <span><span className="font-medium block">{tr(label)}</span>{hint && <span className="text-sm text-plum-900/60">{tr(hint)}</span>}</span>
      <span className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${on ? "bg-primary-fill" : "bg-line"}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} /></span>
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
