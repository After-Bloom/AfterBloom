"use client";
import { useMemo, useState } from "react";
import * as m from "motion/react-m";
import { Check, Info } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { useFamilyView } from "@/lib/data/family";
import { VACCINES, VACCINE_LAST_VERIFIED, MILESTONES } from "@/lib/vaccines";
import { WEIGHT_REF, ageMonths, Sex } from "@/lib/growth";
import { weightNotes } from "@/lib/babylog";
import { FeedingLog } from "@/components/FeedingLog";
import { PageHead, Tabs, Segmented, fmtDate, Disclaimer } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTr } from "@/lib/i18n";
import { rise, stagger, tap } from "@/lib/motion";

const DAY = 86400000;

export default function Baby() {
  const { s, auth } = useApp();
  const act = useActions();
  const fv = useFamilyView();
  const tr = useTr();
  const { dark } = useTheme();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState("vax");
  const [kg, setKg] = useState(""), [cm, setCm] = useState(""), [bw, setBw] = useState("");
  const family = auth.role === "family";
  const readOnly = family;

  const birth = family ? fv.link?.birth ?? new Date().toISOString() : s.mother.birth;
  const babyName = family ? fv.link?.babyName ?? "" : s.mother.babyName;
  const vaccinesDone = family ? fv.vaccines : s.vaccinesDone;
  const dob = new Date(birth);
  const age = Math.floor((Date.now() - dob.getTime()) / DAY);
  const sex: Sex = s.mother.babySex ?? "girl";

  const c = dark ? { grid: "#4A2F3B", tick: "#D6BBBE", base: "#F0A0AB", ref: "#8DBF9F", surface: "#2A1A22", ink: "#F8E9E3" } : { grid: "#F1DDD2", tick: "#6B4A57", base: "#B04A56", ref: "#4F7A5E", surface: "#FFFFFF", ink: "#3B1F2B" };
  const ref = WEIGHT_REF[sex];
  const refData = useMemo(() => ref.p50.map((_, mo) => ({ mo, p3: ref.p3[mo], p50: ref.p50[mo], p97: ref.p97[mo] })), [ref]);
  const babyData = useMemo(() => s.weights.filter((w) => w.kg > 0).map((w) => ({ mo: Math.round(ageMonths(birth, w.date) * 10) / 10, kg: w.kg })), [s.weights, birth]);

  const tabs = family ? [{ id: "vax", label: "Vaccines" }] : [{ id: "vax", label: "Vaccines" }, { id: "feed", label: "Feeding" }, { id: "growth", label: "Growth" }, { id: "miles", label: "Milestones" }, { id: "pmmvy", label: "Benefits" }];

  const nextDue = VACCINES.find((v) => !vaccinesDone.includes(v.id));
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title={tr("{baby}'s care", { baby: tr(babyName || "Baby") })} sub={tr("Born {d} · {n} days old", { d: fmtDate(birth), n: age })} />
      {!family && !s.mother.babyName && <BabyName />}
      <Tabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === "vax" && (
        <m.div variants={stagger()} initial="hidden" animate="show" className="space-y-3">
          {nextDue && <p className="rounded-card bg-plum-100 p-4 text-sm"><b>{tr("Next:")}</b> {tr(nextDue.age)} · {nextDue.vaccines.map((x) => tr(x)).join(", ")}</p>}
          {VACCINES.map((v) => {
            const due = new Date(dob.getTime() + v.days * DAY);
            const done = vaccinesDone.includes(v.id);
            const left = Math.ceil((due.getTime() - Date.now()) / DAY);
            const status = done ? tr("Done") : left < 0 ? tr("Overdue by {n} days", { n: -left }) : left === 0 ? tr("Due today") : tr("Due in {n} days", { n: left });
            const soon = !done && left <= 7 && left >= -30;
            return (
              <m.div variants={rise} key={v.id} className={`card flex gap-3 ${soon ? "!border-primary" : ""}`}>
                <m.button whileTap={tap} disabled={readOnly} onClick={() => act.toggleVaccine(v.id)} aria-pressed={done} aria-label={`${tr(v.age)}: ${done ? tr("Done") : tr("Mark done")}`} className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-ok bg-ok text-white dark:text-[#1C1117]" : "border-line"} ${readOnly ? "cursor-default" : ""}`}>{done && <Check className="h-5 w-5" aria-hidden />}</m.button>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><b>{tr(v.age)}</b><span className={`text-sm font-semibold ${done ? "text-ok" : left < 0 ? "text-danger" : "text-primary"}`}>{status}</span></div>
                  <div className="text-sm text-ink-muted">{fmtDate(due.toISOString())}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">{v.vaccines.map((x) => <span key={x} className="rounded-full bg-plum-100 px-2 py-0.5 text-xs">{tr(x)}</span>)}</div>
                </div>
              </m.div>
            );
          })}
          <p className="text-xs text-ink-muted">{tr("National Immunization Schedule (MoHFW). Last verified:")} {tr(VACCINE_LAST_VERIFIED)}. <b>{tr("Confirm with your ANM or paediatrician.")}</b></p>
        </m.div>
      )}

      {tab === "feed" && !family && <FeedingLog />}

      {tab === "growth" && !family && (
        <section className="card space-y-4">
          <p className="text-sm">{tr("Log {baby}'s weight. The chart shows the trend only; it never says \"malnourished\". That is a doctor's judgement.", { baby: tr(babyName || "Baby") })}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[10rem] flex-1 text-sm font-bold text-plum-800">{tr("Birth weight (kg)")}<input className="input mt-1" inputMode="decimal" placeholder="3.0" value={bw || (s.mother.birthWeightKg ?? "")} onChange={(e) => setBw(e.target.value)} /></label>
            <button className="btn-soft" disabled={!(+bw > 0)} onClick={() => { void act.setBirthWeight(+bw); setBw(""); }}>{tr("Save")}</button>
          </div>
          {weightNotes(s.mother.birthWeightKg, s.weights, age).map((n) => <p key={n.text} role="status" className={`rounded-card border p-3 text-sm ${n.tone === "warn" ? "border-warn/50 bg-warn/10" : "border-line bg-surface-2"}`}>{tr(n.text)}</p>)}
          <Segmented<Sex> label="Baby's sex (for the right reference lines)" value={sex} onChange={(v) => act.setBabySex(v)} options={[{ id: "girl", label: "Girl" }, { id: "boy", label: "Boy" }]} />
          <div className="flex flex-wrap gap-2">
            <label className="min-w-[8rem] flex-1 text-sm font-bold text-plum-800">{tr("Weight (kg)")}<input className="input mt-1" inputMode="decimal" placeholder="3.4" value={kg} onChange={(e) => setKg(e.target.value)} /></label>
            <label className="min-w-[8rem] flex-1 text-sm font-bold text-plum-800">{tr("Length (cm, optional)")}<input className="input mt-1" inputMode="decimal" placeholder="52" value={cm} onChange={(e) => setCm(e.target.value)} /></label>
            <button className="btn-primary self-end" disabled={!(+kg > 0)} onClick={() => { void act.addGrowth(+kg, +cm > 0 ? +cm : undefined); setKg(""); setCm(""); }}>{tr("Add")}</button>
          </div>
          <div style={{ height: 260 }} role="img" aria-label={tr("Weight against the reference range, by age in months")}>
            <ResponsiveContainer>
              <LineChart margin={{ left: -18, right: 10, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis type="number" dataKey="mo" domain={[0, 12]} ticks={[0, 2, 4, 6, 8, 10, 12]} tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} label={{ value: tr("months"), position: "insideBottomRight", offset: -2, fontSize: 11, fill: c.tick }} />
                <YAxis domain={[2, 13]} tick={{ fontSize: 11, fill: c.tick }} stroke={c.grid} unit=" kg" />
                <Tooltip contentStyle={{ background: c.surface, color: c.ink, border: `1px solid ${c.grid}`, borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line data={refData} dataKey="p97" name={tr("Upper range")} stroke={c.ref} strokeDasharray="5 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                <Line data={refData} dataKey="p50" name={tr("Typical")} stroke={c.ref} dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line data={refData} dataKey="p3" name={tr("Lower range")} stroke={c.ref} strokeDasharray="5 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                <Line data={babyData} dataKey="kg" name={tr("{baby}'s weight", { baby: tr(babyName || "Baby") })} stroke={c.base} strokeWidth={3} dot={{ r: 4 }} isAnimationActive={!reduce} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {s.weights.some((w) => w.cm) && <p className="text-sm text-ink-muted">{tr("Length")}: {s.weights.filter((w) => w.cm).map((w) => `${w.cm} cm (${fmtDate(w.date)})`).join(" · ")}</p>}
          <p className="flex items-start gap-1.5 text-xs text-ink-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{tr("Reference lines are approximate WHO growth values. Babies grow in their own pattern: talk to your doctor if you are worried.")}</p>
        </section>
      )}

      {tab === "miles" && !family && (
        <m.div variants={stagger()} initial="hidden" animate="show" className="space-y-3">
          {MILESTONES.map((ms) => (
            <m.section variants={rise} key={ms.age} className="card"><h2 className="font-serif text-xl">{tr(ms.age)}</h2>
              {ms.items.map((it) => { const k = `${ms.age}:${it}`; return <label key={k} className="mt-1 flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--primary-fill))]" checked={s.milestonesDone.includes(k)} onChange={() => act.toggleMilestone(k)} />{tr(it)}</label>; })}
            </m.section>
          ))}
          <p className="text-xs text-ink-muted">{tr("Every baby develops at their own pace. This checklist is a guide, not a test. Always talk to your doctor if you are worried.")}</p>
        </m.div>
      )}

      {tab === "pmmvy" && !family && (
        <section className="card space-y-3">
          <h2 className="font-serif text-xl">{tr("PMMVY maternity benefit")}</h2>
          <p className="text-sm">{tr("For a first child, the government scheme pays ₹5,000 in two instalments. One is linked to the baby's 14-week vaccinations.")}</p>
          {[{ id: "pmmvy1", t: "Instalment 1: register the pregnancy and get a health check", done: s.benefits.includes("pmmvy1") }, { id: "pmmvy2", t: "Instalment 2: birth registered + first cycle of vaccines (up to 14 weeks)", done: s.benefits.includes("pmmvy2") || s.vaccinesDone.includes("14w") }].map((x) => (
            <label key={x.id} className="flex min-h-[56px] items-center gap-3 rounded-control border border-line p-3"><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--primary-fill))]" checked={x.done} onChange={() => act.toggleBenefit(x.id)} />{tr(x.t)}</label>
          ))}
          <p className="rounded-control bg-plum-100 p-3 text-sm">{tr("Check eligibility and exact steps with your ANM or Anganwadi. Rules may change.")}</p>
        </section>
      )}
      <Disclaimer />
    </div>
  );
}

function BabyName() {
  const act = useActions();
  const tr = useTr();
  const [v, setV] = useState("");
  return (
    <div className="card flex flex-wrap items-end gap-2"><label className="min-w-[10rem] flex-1 text-sm font-bold text-plum-800">{tr("Your baby's name")}<input className="input mt-1" value={v} onChange={(e) => setV(e.target.value)} /></label><button className="btn-primary" disabled={!v.trim()} onClick={() => act.setBabyName(v.trim())}>{tr("Save")}</button></div>
  );
}
