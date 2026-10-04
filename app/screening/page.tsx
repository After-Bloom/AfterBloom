"use client";
import Link from "next/link";
import { useState } from "react";
import { Phone } from "lucide-react";
import { useApp, uid, daysSince } from "@/lib/store";
import { EPDS, EPDS_SCHEDULE, scoreEpds, EpdsBand } from "@/lib/epds";
import { PageHead, Disclaimer, fmtDate } from "@/components/ui";
import { useTr } from "@/lib/i18n";

export default function Screening() {
  const { s, set, openCrisis } = useApp();
  const tr = useTr();
  const [step, setStep] = useState(-1); // -1 intro, 0..9 questions, 10 result
  const [ans, setAns] = useState<number[]>([]);
  const [band, setBand] = useState<EpdsBand | null>(null);
  const age = daysSince(s.mother.birth);

  const pick = (score: number) => {
    const next = [...ans.slice(0, step), score];
    setAns(next);
    if (step < EPDS.length - 1) return setStep(step + 1);
    const r = scoreEpds(next);
    const now = new Date().toISOString();
    set((p) => {
      const flags = [...p.flags];
      if (r.selfHarm) flags.unshift({ id: uid(), date: now, kind: "q10", text: "EPDS question 10 positive: thoughts of self-harm", resolved: false, dueAt: now });
      else if (r.band === "probable") flags.unshift({ id: uid(), date: now, kind: "epds", text: `EPDS ${r.total}: probable depression`, resolved: false, dueAt: new Date(Date.now() + 48 * 3600000).toISOString() });
      return { ...p, epds: [{ date: now, total: r.total, band: r.band, selfHarm: r.selfHarm }, ...p.epds], flags };
    });
    setBand(r.band);
    setStep(EPDS.length);
    if (r.selfHarm) openCrisis({ kind: "selfharm", reason: "Your answer to the last question" });
  };

  const q = EPDS[step];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="Mind check" sub="A routine wellness check we offer every new mother. It takes 2 minutes." tag="EPDS" />

      {step === -1 && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <p>{tr("Feeling low, worried or overwhelmed after birth is very common, and it is treatable. These 10 questions help your care team support you. There are no right or wrong answers.")}</p>
            <p className="text-sm text-plum-900/70">{tr("Think about how you have felt")} <b>{tr("in the past 7 days")}</b>{tr(", not just today.")}</p>
            <button className="btn-primary w-full" onClick={() => { setAns([]); setStep(0); }}>{tr("Start (2 minutes)")}</button>
          </div>
          <div className="card">
            <h3 className="font-bold mb-2">{tr("When we offer it")}</h3>
            <ul className="space-y-1.5 text-sm">
              {EPDS_SCHEDULE.map((e) => (
                <li key={e.label} className="flex justify-between"><span>{tr(e.label)}</span><span className={e.day <= age ? "text-emerald-700 font-medium" : "text-gray-500"}>{e.day <= age ? tr("due now") : tr("in {n} days", { n: e.day - age })}</span></li>
              ))}
            </ul>
          </div>
          {s.epds.length > 0 && (
            <div className="card">
              <h3 className="font-bold mb-2">{tr("Your past checks")}</h3>
              {s.epds.map((e) => <div key={e.date} className="flex justify-between border-b border-plum-100 py-1.5 text-sm last:border-0"><span>{fmtDate(e.date)}</span><span>{e.band === "low" ? tr("Doing well") : tr("Your care team is in touch")}</span></div>)}
            </div>
          )}
          <p className="text-xs text-plum-900/60">{tr("Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987). Hindi wording: translation pending clinician review.")}</p>
          <Disclaimer>Free help any time: Tele-MANAS 14416 (24×7). This check is screening support, not a diagnosis.</Disclaimer>
        </div>
      )}

      {step >= 0 && step < EPDS.length && (
        <div className="card space-y-4">
          <div className="h-2 rounded-full bg-plum-100"><div className="h-2 rounded-full bg-plum-600 transition-all" style={{ width: `${(step / EPDS.length) * 100}%` }} /></div>
          <p className="text-sm text-plum-900/60">{tr("Question {a} of {b}", { a: step + 1, b: EPDS.length })}</p>
          <h2 className="text-xl font-bold">{tr(q.q)}</h2>
          <div className="space-y-2">{q.options.map((o) => <button key={o.text} onClick={() => pick(o.score)} className="w-full rounded-xl border border-plum-200 bg-white p-4 text-left hover:bg-plum-100 active:bg-plum-200">{tr(o.text)}</button>)}</div>
          {step > 0 && <button className="text-sm underline text-plum-700" onClick={() => setStep(step - 1)}>← {tr("Back")}</button>}
        </div>
      )}

      {step === EPDS.length && band && (
        <div className="space-y-4">
          {band === "low" && <div className="card border-emerald-300 bg-emerald-50 space-y-2"><h2 className="text-xl font-bold">{tr("Thank you 💜")}</h2><p>{tr("You seem to be coping well right now. Keep talking, keep resting, and keep checking in. We will remind you before your next check.")}</p></div>}
          {band === "possible" && (
            <div className="card space-y-3"><h2 className="text-xl font-bold">{tr("Thank you for sharing 💜")}</h2><p>{tr("Many mothers feel this way, and support makes a real difference. We suggest talking to a counsellor, and we will offer this check again in 2 weeks.")}</p><Link href="/care" className="btn-primary inline-flex">{tr("Talk to a counsellor")}</Link></div>
          )}
          {band === "probable" && (
            <div className="card space-y-3"><h2 className="text-xl font-bold">{tr("Our care team will be in touch.")}</h2><p>{tr("Your psychologist will call you within 24 to 48 hours to talk it through. You do not need to do anything else.")}</p></div>
          )}
          {band !== "low" && <a href="tel:14416" className="card flex items-center gap-3 border-emerald-300 bg-emerald-50"><Phone className="text-emerald-700" /><span><b>{tr("Want to talk sooner?")}</b> {tr("Tele-MANAS")} 14416: {tr("free, 24×7, 20 languages.")}</span></a>}
          <button className="btn-ghost w-full" onClick={() => { setStep(-1); setBand(null); }}>{tr("Done")}</button>
        </div>
      )}
    </div>
  );
}
