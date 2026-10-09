"use client";
import { useEffect, useMemo, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useApp, dayStr, daysSince } from "@/lib/store";
import { bpPlan, bpTrend } from "@/lib/risk";
import { BpWatch } from "@/components/BpWatch";
import { RecoveryProfile } from "@/components/RecoveryProfile";
import { useActions } from "@/lib/actions";
import { triageCheckin, DangerAnswers } from "@/lib/triage";
import { PageHead, Disclaimer } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { TriageResult } from "@/components/TriageResult";
import { TrendChart, BpChart } from "@/components/Charts";
import { BloomProgress } from "@/components/BloomProgress";
import { rise, slide, spring, tap } from "@/lib/motion";

// Emoji faces are the tap scale; every face also has a word so it never relies on the picture alone.
const FACES = [{ e: "😢", l: "Very low" }, { e: "😕", l: "Low" }, { e: "😐", l: "Okay" }, { e: "🙂", l: "Good" }, { e: "😄", l: "Great" }];
const SLEEP = [{ h: 3, l: "<4" }, { h: 5, l: "4-5" }, { h: 6.5, l: "6-7" }, { h: 8, l: "8+" }];
const STEPS = 3;

function FaceScale({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const tr = useTr();
  return (
    <fieldset>
      <legend className="mb-3 font-serif text-2xl text-plum-800">{tr(label)}</legend>
      <div className="grid grid-cols-5 gap-2">
        {FACES.map((f, i) => {
          const on = value === i + 1;
          return (
            <m.button key={i} type="button" whileTap={{ scale: 0.88 }} animate={{ scale: on ? 1.08 : 1 }} transition={spring.snappy} onClick={() => onChange(i + 1)} aria-pressed={on}
              className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 ${on ? "border-primary bg-plum-100" : "border-line bg-surface"}`}>
              <span className="text-3xl leading-none" aria-hidden>{f.e}</span>
              <span className="text-[11px] font-bold leading-tight text-ink-muted">{tr(f.l)}</span>
            </m.button>
          );
        })}
      </div>
    </fieldset>
  );
}

function YesNo({ q, v, onChange }: { q: string; v: boolean; onChange: (b: boolean) => void }) {
  const tr = useTr();
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="min-w-0 flex-1 text-base">{tr(q)}</span>
      <div role="radiogroup" aria-label={tr(q)} className="flex shrink-0 gap-1.5">
        {[false, true].map((b) => (
          <m.button key={String(b)} type="button" role="radio" aria-checked={v === b} whileTap={tap} onClick={() => onChange(b)}
            className={`flex min-h-[48px] min-w-[64px] items-center justify-center gap-1 rounded-full border-2 px-3 text-sm font-bold ${v === b ? (b ? "border-warn bg-warn/15 text-warn" : "border-ok bg-ok/15 text-ok") : "border-line text-ink-muted"}`}>
            {v === b && (b ? <X className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />)}{b ? tr("Yes") : tr("No")}
          </m.button>
        ))}
      </div>
    </div>
  );
}

export default function Checkin() {
  const { s, openCrisis } = useApp();
  const act = useActions();
  const [saveErr, setSaveErr] = useState(false);
  const tr = useTr();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [mood, setMood] = useState(3), [appetite, setApp] = useState(3), [sleep, setSleep] = useState(5);
  const [d, setD] = useState<DangerAnswers>({ bleeding: false, fever: false, headache: "none", wound: false, breathing: false });
  const planNow = bpPlan(s.risk, daysSince(s.mother.birth), s.checkins);
  const [bpOn, setBpOn] = useState(planNow.due), [sys, setSys] = useState(""), [dia, setDia] = useState("");
  const [out, setOut] = useState<ReturnType<typeof triageCheckin> | null>(null);
  const [editing, setEditing] = useState(false);

  const today = dayStr(new Date());
  const weekCount = useMemo(() => {
    const days = new Set(s.checkins.map((c) => dayStr(c.date)));
    let n = 0;
    for (let i = 0; i < 7; i++) if (days.has(dayStr(new Date(Date.now() - i * 86400000)))) n++;
    return n;
  }, [s.checkins]);
  const doneToday = s.checkins.some((c) => dayStr(c.date) === today);

  // bloom opens from last week's count to this week's after saving
  const [bloom, setBloom] = useState(weekCount / 7);
  const [shown, setShown] = useState(false);
  useEffect(() => { if (!shown) setBloom(weekCount / 7); }, [weekCount, shown]);

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); };

  const submit = () => {
    const bp = bpOn && sys && dia ? { sys: +sys, dia: +dia } : undefined;
    const r = triageCheckin(d, bp);
    // a pattern across the last few readings (two raised in a row, or a steady rise) raises the level even if today's single reading looks fine
    const trend = bp ? bpTrend([...s.checkins.filter((c) => dayStr(c.date) !== today), { date: new Date().toISOString(), bp }]) : null;
    if (trend && r.level !== "RED") { r.level = "AMBER"; r.reasons.push(trend.why); }
    const before = weekCount;
    const rec = { date: new Date().toISOString(), mood, appetite, sleepHours: sleep, level: r.level, bp };
    setOut(r); setShown(true); setBloom(before / 7); setDir(1); setStep(STEPS);
    setSaveErr(false);
    const saved = act.saveCheckin(rec, r.reasons).catch(() => { setSaveErr(true); return null; });
    setTimeout(() => setBloom(Math.min(7, doneToday ? before : before + 1) / 7), 500);
    if (r.level === "RED") {
      void act.reportEmergency("medical" as any, r.reasons.join(", "), saved);
      openCrisis({ kind: "medical", reason: r.reasons.join(", ") });
    }
  };

  const restart = () => { setShown(false); setEditing(false); setOut(null); setDir(-1); setStep(0); };
  const bps = s.checkins.filter((c) => c.bp);
  const onResult = step === STEPS;
  const showDone = doneToday && !shown && !editing && step === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHead title="Daily check-in" sub="30 seconds. Tap, don't type." tag="First 6 weeks" />
      <RecoveryProfile />
      <BpWatch inCheckin />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="card min-w-0 overflow-hidden">
          {!onResult && !showDone && (
            <div className="mb-5" aria-label={tr("Step {a} of {b}", { a: step + 1, b: STEPS })} role="group">
              <div className="flex gap-1.5">{Array.from({ length: STEPS }, (_, i) => <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><m.span className="block h-full rounded-full bg-primary-fill" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={spring.gentle} /></span>)}</div>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Step {a} of {b}", { a: step + 1, b: STEPS })}</p>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <m.div key={showDone ? "done" : step} {...slide(dir)}>
              {showDone && (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <BloomProgress value={weekCount / 7} className="w-28" label={tr("Your bloom: {n} of 7 days", { n: weekCount })} />
                  <h2 className="font-serif text-2xl">{tr("You've checked in today. Thank you.")}</h2>
                  <p className="text-ink-muted">{tr("Checked in {n} of 7 days", { n: weekCount })}</p>
                  <button className="btn-ghost mt-2" onClick={() => setEditing(true)}>{tr("Update today's check-in")}</button>
                </div>
              )}

              {!showDone && step === 0 && (
                <div className="space-y-7">
                  <FaceScale label="How is your mood?" value={mood} onChange={setMood} />
                  <FaceScale label="How is your appetite?" value={appetite} onChange={setApp} />
                </div>
              )}

              {step === 1 && (
                <fieldset>
                  <legend className="mb-3 font-serif text-2xl text-plum-800">{tr("How many hours did you sleep (in total)?")}</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {SLEEP.map((x) => (
                      <m.button key={x.h} type="button" whileTap={tap} aria-pressed={sleep === x.h} onClick={() => setSleep(x.h)} className={`min-h-[64px] rounded-2xl border-2 text-lg font-bold ${sleep === x.h ? "border-primary bg-plum-100 text-plum-800" : "border-line text-ink-muted"}`}>{x.l}<span className="ml-1 text-xs font-semibold">{tr("h")}</span></m.button>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-ink-muted">{tr("Broken sleep counts too. Add it all up.")}</p>
                </fieldset>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-1 font-serif text-2xl text-plum-800">{tr("Danger signs today")}</h2>
                  <div className="divide-y divide-line">
                    <YesNo q="Soaking a pad in an hour, or large clots?" v={d.bleeding} onChange={(b) => setD({ ...d, bleeding: b })} />
                    <YesNo q="Fever (above 100.4°F / 38°C)?" v={d.fever} onChange={(b) => setD({ ...d, fever: b })} />
                    <div className="py-3">
                      <div className="mb-2">{tr("Headache?")}</div>
                      <div role="radiogroup" aria-label={tr("Headache?")} className="flex flex-wrap gap-1.5">
                        {([["none", "No"], ["alone", "Yes"], ["vision", "Yes, with blurred vision"]] as const).map(([k, l]) => (
                          <m.button key={k} type="button" role="radio" aria-checked={d.headache === k} whileTap={tap} onClick={() => setD({ ...d, headache: k })} className={`min-h-[48px] rounded-full border-2 px-4 text-sm font-bold ${d.headache === k ? (k === "none" ? "border-ok bg-ok/15 text-ok" : "border-warn bg-warn/15 text-warn") : "border-line text-ink-muted"}`}>{tr(l)}</m.button>
                        ))}
                      </div>
                    </div>
                    <YesNo q="Wound red, swollen or leaking?" v={d.wound} onChange={(b) => setD({ ...d, wound: b })} />
                    <YesNo q="Chest pain or trouble breathing?" v={d.breathing} onChange={(b) => setD({ ...d, breathing: b })} />
                    <div className="py-1">
                      <YesNo q="Log a home blood pressure reading?" v={bpOn} onChange={setBpOn} />
                      {bpOn && (
                        <div className="mb-2 flex gap-2">
                          <input className="input" inputMode="numeric" aria-label={tr("Upper (e.g. 120)")} placeholder={tr("Upper (e.g. 120)")} value={sys} onChange={(e) => setSys(e.target.value)} />
                          <input className="input" inputMode="numeric" aria-label={tr("Lower (e.g. 80)")} placeholder={tr("Lower (e.g. 80)")} value={dia} onChange={(e) => setDia(e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {onResult && out && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <BloomProgress value={bloom} className="w-28" label={tr("Your bloom: {n} of 7 days", { n: weekCount })} />
                    <p className="text-sm font-semibold text-ink-muted">{tr("Checked in {n} of 7 days", { n: weekCount })}</p>
                  </div>
                  {out.level === "GREEN"
                    ? <m.div variants={rise} initial="hidden" animate="show" className="rounded-card border-2 border-ok/40 bg-ok/10 p-5 text-center"><p className="font-serif text-2xl text-plum-800">{tr("Thank you for checking in. Everything looks fine today.")}</p></m.div>
                    : <TriageResult level={out.level} reasons={out.reasons} />}
                  {saveErr && <p role="alert" className="rounded-control bg-warn/10 p-3 text-sm font-semibold text-warn">{tr("We could not save this check-in. Please check your connection and try again.")}</p>}
                  <button className="btn-ghost w-full" onClick={restart}>{tr("Done")}</button>
                </div>
              )}
            </m.div>
          </AnimatePresence>

          {!onResult && !showDone && (
            <div className="mt-6 flex gap-2">
              {step > 0 && <button className="btn-ghost" onClick={() => go(step - 1)}><ArrowLeft className="h-4 w-4" aria-hidden />{tr("Back")}</button>}
              {step < STEPS - 1
                ? <button className="btn-primary flex-1 !py-3.5 text-base" onClick={() => go(step + 1)}>{tr("Next")}<ArrowRight className="h-4 w-4" aria-hidden /></button>
                : <button className="btn-primary flex-1 !py-3.5 text-base" onClick={submit}>{tr("Save today's check-in")}</button>}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <div className="card">
            <h2 className="mb-2 font-serif text-xl">{tr("Your trend")}</h2>
            <TrendChart data={s.checkins} />
            <p className="mt-2 text-sm text-ink-muted">{tr("A trend over two weeks tells more than a single bad day. With your consent, your professional sees this chart between sessions.")}</p>
          </div>
          {bps.length > 0 && <div className="card"><h2 className="mb-2 font-serif text-xl">{tr("Blood pressure")}</h2><BpChart data={bps} /></div>}
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}
