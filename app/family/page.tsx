"use client";
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { PageHead, Toggle, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { NightFeeds } from "@/components/NightFeeds";

const RELATIONS = ["Husband / partner", "My mother", "Mother-in-law", "Other"];

export default function FamilyCircle() {
  const { s, set } = useApp();
  const tr = useTr();
  const [name, setName] = useState("");
  const [rel, setRel] = useState(RELATIONS[0]);

  const add = () => {
    if (!name.trim()) return;
    set((p) => ({ ...p, family: [...p.family, { id: uid(), name: name.trim(), relation: rel, sees: { alerts: true, trends: false, weekly: false } }] }));
    setName("");
  };
  const setSee = (id: string, k: "alerts" | "trends" | "weekly", v: boolean) =>
    set((p) => ({ ...p, family: p.family.map((f) => (f.id === id ? { ...f, sees: { ...f.sees, [k]: v } } : f)) }));

  return (
    <div className="grid max-w-6xl items-start gap-5 lg:grid-cols-2 [&>*:first-child]:col-span-full">
      <PageHead title="Family circle" sub="Support from family is the strongest protection for a new mother. You choose who joins and what each person sees." />

      <div className="card space-y-3">
        <h3 className="font-bold">{tr("Invite someone")}</h3>
        <input className="input" placeholder={tr("Name")} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-wrap gap-2">{RELATIONS.map((r) => <button key={r} onClick={() => setRel(r)} className={`chip ${rel === r ? "chip-on" : ""}`}>{tr(r)}</button>)}</div>
        <button className="btn-primary w-full" onClick={add}><UserPlus className="h-4 w-4" />{tr("Send invite (WhatsApp link)")}</button>
      </div>

      {s.family.map((f) => (
        <div key={f.id} className="card">
          <div className="flex items-start justify-between">
            <div><div className="font-bold">{tr(f.name)}</div><div className="text-sm text-plum-900/60">{tr(f.relation)}</div></div>
            <button className="text-red-600 flex items-center gap-1 text-sm" onClick={() => set((p) => ({ ...p, family: p.family.filter((x) => x.id !== f.id) }))}><Trash2 className="h-4 w-4" />{tr("Remove")}</button>
          </div>
          <div className="mt-2 divide-y divide-plum-100">
            <Toggle on={f.sees.alerts} onChange={(v) => setSee(f.id, "alerts", v)} label="Safety alerts" hint="RED symptoms and missed check-ins" />
            <Toggle on={f.sees.trends} onChange={(v) => setSee(f.id, "trends", v)} label="Mood and sleep trends" />
            <Toggle on={f.sees.weekly} onChange={(v) => setSee(f.id, "weekly", v)} label={'Weekly "how to help" note'} hint="No scores or health details" />
          </div>
        </div>
      ))}

      <div className="card">
        <Toggle on={s.consent.emergencyAlert} onChange={(v) => set((p) => ({ ...p, consent: { ...p.consent, emergencyAlert: v } }))} label="Alert my emergency contact on a RED result" hint={tr("Currently: {c}. Only if you agree in advance.", { c: tr(s.consent.emergencyContact) })} />
      </div>

      <div className="card"><h3 className="font-bold mb-2">{tr("Night-feed planner")}</h3><NightFeeds me={s.mother.name} /></div>

      {s.alerts.length > 0 && (
        <div className="card"><h3 className="font-bold mb-2">{tr("Alerts sent to family")}</h3>{s.alerts.map((a) => <div key={a.id} className="text-sm border-b border-plum-100 py-1.5 last:border-0"><span className="text-plum-900/60">{fmtTime(a.at)}</span> - {tr(a.text)}</div>)}</div>
      )}
    </div>
  );
}
