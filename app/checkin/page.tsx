"use client";
import { useState } from "react";
import { useApp, dayStr, uid } from "@/lib/store";
import { triageCheckin, DangerAnswers } from "@/lib/triage";
import { PageHead, Disclaimer } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { TriageResult } from "@/components/TriageResult";
import { TrendChart, BpChart } from "@/components/Charts";

const FACES = ["😢", "😕", "😐", "🙂", "😄"];
function Scale({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const tr = useTr();
  return (
    <div>
      <div className="font-medium mb-1">{tr(label)}</div>
      <div className="flex gap-2">{FACES.map((f, i) => <button key={i} onClick={() => onChange(i + 1)} className={`h-12 flex-1 rounded-xl border text-2xl ${value === i + 1 ? "border-plum-700 bg-plum-100" : "border-plum-200 bg-white"}`} aria-label={`${tr(label)} ${i + 1}`}>{f}</button>)}</div>
    </div>
  );
}
function YesNo({ q, v, onChange }: { q: string; v: boolean; onChange: (b: boolean) => void }) {
  const tr = useTr();
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span>{tr(q)}</span>
      <div className="flex gap-1 shrink-0">{[false, true].map((b) => <button key={String(b)} onClick={() => onChange(b)} className={`chip ${v === b ? "chip-on" : ""}`}>{b ? tr("Yes") : tr("No")}</button>)}</div>
    </div>
  );
}

export default function Checkin() {
  const { s, set, openCrisis, alertFamily } = useApp();
  const tr = useTr();
  const [mood, setMood] = useState(3), [appetite, setApp] = useState(3), [sleep, setSleep] = useState(5);
  const [d, setD] = useState<DangerAnswers>({ bleeding: false, fever: false, headache: "none", wound: false, breathing: false });
  const [bpOn, setBpOn] = useState(false), [sys, setSys] = useState(""), [dia, setDia] = useState("");
  const [out, setOut] = useState<ReturnType<typeof triageCheckin> | null>(null);

  const submit = () => {
    const bp = bpOn && sys && dia ? { sys: +sys, dia: +dia } : undefined;
    const r = triageCheckin(d, bp);
    setOut(r);
    const rec = { date: new Date().toISOString(), mood, appetite, sleepHours: sleep, level: r.level, bp };
    set((p) => ({ ...p, checkins: [...p.checkins.filter((c) => dayStr(c.date) !== dayStr(rec.date)), rec] }));
    if (r.level === "RED") {
      alertFamily(`RED check-in for ${s.mother.name}: ${r.reasons.join(", ")}`);
      set((p) => ({ ...p, flags: [{ id: uid(), date: rec.date, kind: "red", text: r.reasons.join(", "), resolved: false, dueAt: new Date(Date.now() + 3600000).toISOString() }, ...p.flags] }));
      openCrisis({ kind: "medical", reason: r.reasons.join(", ") });
    }
  };

  const bps = s.checkins.filter((c) => c.bp);
  return (
    <div className="max-w-6xl space-y-5">
      <PageHead title="Daily check-in" sub="30 seconds. Tap, don't type." tag="First 6 weeks" />
      <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="space-y-5">
      <div className="card space-y-4">
        <Scale label="How is your mood?" value={mood} onChange={setMood} />
        <Scale label="How is your appetite?" value={appetite} onChange={setApp} />
        <div>
          <div className="font-medium mb-1">{tr("How many hours did you sleep (in total)?")}</div>
          <div className="flex gap-2">{[3, 5, 6.5, 8].map((h) => <button key={h} onClick={() => setSleep(h)} className={`chip flex-1 justify-center ${sleep === h ? "chip-on" : ""}`}>{h === 3 ? "<4" : h === 5 ? "4-5" : h === 6.5 ? "6-7" : "8+"} {tr("h")}</button>)}</div>
        </div>
      </div>

      <div className="card divide-y divide-plum-100">
        <h3 className="font-bold pb-2">{tr("Danger signs today")}</h3>
        <YesNo q="Soaking a pad in an hour, or large clots?" v={d.bleeding} onChange={(b) => setD({ ...d, bleeding: b })} />
        <YesNo q="Fever (above 100.4°F / 38°C)?" v={d.fever} onChange={(b) => setD({ ...d, fever: b })} />
        <div className="py-2">
          <div className="mb-1">{tr("Headache?")}</div>
          <div className="flex flex-wrap gap-1">{([["none", "No"], ["alone", "Yes"], ["vision", "Yes, with blurred vision"]] as const).map(([k, l]) => <button key={k} onClick={() => setD({ ...d, headache: k })} className={`chip ${d.headache === k ? "chip-on" : ""}`}>{tr(l)}</button>)}</div>
        </div>
        <YesNo q="Wound red, swollen or leaking?" v={d.wound} onChange={(b) => setD({ ...d, wound: b })} />
        <YesNo q="Chest pain or trouble breathing?" v={d.breathing} onChange={(b) => setD({ ...d, breathing: b })} />
        <div className="py-2">
          <YesNo q="Log a home blood pressure reading?" v={bpOn} onChange={setBpOn} />
          {bpOn && <div className="flex gap-2 mt-2"><input className="input" inputMode="numeric" placeholder={tr("Upper (e.g. 120)")} value={sys} onChange={(e) => setSys(e.target.value)} /><input className="input" inputMode="numeric" placeholder={tr("Lower (e.g. 80)")} value={dia} onChange={(e) => setDia(e.target.value)} /></div>}
        </div>
      </div>
      <button className="btn-primary w-full" onClick={submit}>{tr("Save today's check-in")}</button>
      {out && (out.level === "GREEN" ? <div className="card bg-emerald-50 border-emerald-200">{tr("Thank you for checking in 💜 Everything looks fine today.")}</div> : <TriageResult level={out.level} reasons={out.reasons} />)}

      </div>
      <div className="space-y-5 lg:sticky lg:top-24">
      <div className="card">
        <h3 className="font-bold mb-2">{tr("Your trend")}</h3>
        <TrendChart data={s.checkins} />
        <p className="text-sm text-plum-900/60 mt-2">{tr("A trend over two weeks tells more than a single bad day. With your consent, your professional sees this chart between sessions.")}</p>
      </div>
      {bps.length > 0 && <div className="card"><h3 className="font-bold mb-2">{tr("Blood pressure")}</h3><BpChart data={bps} /></div>}
      </div>
      </div>
      <Disclaimer />
    </div>
  );
}
