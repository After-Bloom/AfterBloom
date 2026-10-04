"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { VACCINES, VACCINE_LAST_VERIFIED, MILESTONES } from "@/lib/vaccines";
import { PageHead, Tabs, Soon, fmtDate } from "@/components/ui";
import { TrendChart } from "@/components/Charts";
import { useTr } from "@/lib/i18n";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const DAY = 86400000;

export default function Baby() {
  const { s, set } = useApp();
  const tr = useTr();
  const [tab, setTab] = useState("vax");
  const [kg, setKg] = useState("");
  const dob = new Date(s.mother.birth);
  const age = Math.floor((Date.now() - dob.getTime()) / DAY);
  const toggle = (key: string, list: "vaccinesDone" | "milestonesDone") => set((p) => ({ ...p, [list]: p[list].includes(key) ? p[list].filter((x) => x !== key) : [...p[list], key] }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title={tr("{baby}'s care", { baby: tr(s.mother.babyName) })} sub={tr("Born {d} · {n} days old", { d: fmtDate(s.mother.birth), n: age })} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "vax", label: "Vaccines" }, { id: "growth", label: "Growth (next)" }, { id: "miles", label: "Milestones (next)" }, { id: "pmmvy", label: "Benefits (next)" }]} />

      {tab === "vax" && (
        <div className="space-y-3">
          {VACCINES.map((v) => {
            const due = new Date(dob.getTime() + v.days * DAY);
            const done = s.vaccinesDone.includes(v.id);
            const left = Math.ceil((due.getTime() - Date.now()) / DAY);
            const status = done ? tr("Done") : left < 0 ? tr("Overdue by {n} days", { n: -left }) : left === 0 ? tr("Due today") : tr("Due in {n} days", { n: left });
            return (
              <div key={v.id} className={`card flex gap-3 ${!done && left <= 7 && left >= -30 ? "border-plum-500" : ""}`}>
                <button onClick={() => toggle(v.id, "vaccinesDone")} aria-label={tr("Mark done")} className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-emerald-600 bg-emerald-600 text-white" : "border-plum-300"}`}>{done && <Check className="h-4 w-4" />}</button>
                <div className="flex-1">
                  <div className="flex justify-between gap-2"><b>{tr(v.age)}</b><span className={`text-sm font-medium ${done ? "text-emerald-700" : left < 0 ? "text-red-700" : "text-plum-700"}`}>{status}</span></div>
                  <div className="text-sm text-plum-900/60">{fmtDate(due.toISOString())}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">{v.vaccines.map((x) => <span key={x} className="rounded-full bg-plum-100 px-2 py-0.5 text-xs">{tr(x)}</span>)}</div>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-plum-900/60">{tr("National Immunization Schedule (MoHFW). Last verified:")} {tr(VACCINE_LAST_VERIFIED)}. <b>{tr("Confirm with your ANM or paediatrician.")}</b></p>
        </div>
      )}

      {tab === "growth" && (
        <div className="card space-y-3">
          <p className="text-sm">{tr("Log {baby}'s weight. The chart shows the trend only; it never says \"malnourished\". That is a doctor's judgement.", { baby: tr(s.mother.babyName) })}</p>
          <div className="flex gap-2"><input className="input" inputMode="decimal" placeholder={tr("Weight in kg, e.g. 3.4")} value={kg} onChange={(e) => setKg(e.target.value)} /><button className="btn-primary" onClick={() => { if (+kg > 0) { set((p) => ({ ...p, weights: [...p.weights, { date: new Date().toISOString(), kg: +kg }] })); setKg(""); } }}>{tr("Add")}</button></div>
          <div style={{ height: 200 }}><ResponsiveContainer><LineChart data={s.weights.map((w) => ({ day: fmtDate(w.date), kg: w.kg }))} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" stroke="#f4e1ec" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} /><Tooltip /><Line name={tr("kg")} dataKey="kg" stroke="#5a1a33" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div>
          <Soon>Plot against the WHO Child Growth Standards curves, with length and head size.</Soon>
        </div>
      )}

      {tab === "miles" && (
        <div className="space-y-3">
          {MILESTONES.map((m) => (
            <div key={m.age} className="card"><b>{tr(m.age)}</b>{m.items.map((it) => { const k = `${m.age}:${it}`; return <label key={k} className="mt-2 flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-plum-700" checked={s.milestonesDone.includes(k)} onChange={() => toggle(k, "milestonesDone")} />{tr(it)}</label>; })}</div>
          ))}
          <Soon>Full checklist from WHO or the Indian Academy of Pediatrics, reviewed by a paediatrician. Always talk to your doctor if you are worried.</Soon>
        </div>
      )}

      {tab === "pmmvy" && (
        <div className="card space-y-3">
          <h3 className="font-bold">{tr("PMMVY maternity benefit")}</h3>
          <p className="text-sm">{tr("For a first child, the government scheme pays ₹5,000 in two instalments. One is linked to the baby's 14-week vaccinations.")}</p>
          <div className="space-y-2">
            {[{ t: "Instalment 1: register the pregnancy and get a health check", done: true }, { t: "Instalment 2: birth registered + first cycle of vaccines (up to 14 weeks)", done: s.vaccinesDone.includes("14w") }].map((x) => (
              <div key={x.t} className="flex items-center gap-3 rounded-xl border border-plum-100 p-3"><span className={`h-5 w-5 rounded-full ${x.done ? "bg-emerald-600" : "border-2 border-plum-300"}`} />{tr(x.t)}</div>
            ))}
          </div>
          <Soon>Check eligibility and exact steps with your ANM or Anganwadi. Rules may change.</Soon>
        </div>
      )}
    </div>
  );
}
