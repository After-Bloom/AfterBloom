"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, Check, Flower2, HeartHandshake, Phone } from "lucide-react";
import { useApp, uid, daysSince } from "@/lib/store";
import { EPDS, EPDS_SCHEDULE, scoreEpds, EpdsBand } from "@/lib/epds";
import { PageHead, Disclaimer, fmtDate } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { rise, slide, spring, stagger, tap } from "@/lib/motion";

// Mother-facing rules: no score, no grade, and never the word "depression" in a result.
// 0-9 warm message. 10-12 supportive + counsellor offer. 13+ ONLY "Our care team will be in touch." + Tele-MANAS.
// Question 10 scored 1 or more opens the crisis screen immediately and overrides everything.

export default function Screening() {
  const { s, set, openCrisis } = useApp();
  const tr = useTr();
  const [step, setStep] = useState(-1); // -1 intro, 0..9 questions, 10 result
  const [dir, setDir] = useState(1);
  const [ans, setAns] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [band, setBand] = useState<EpdsBand | null>(null);
  const busy = useRef(false);
  const age = daysSince(s.mother.birth);

  const finish = (answers: number[]) => {
    const r = scoreEpds(answers);
    const now = new Date().toISOString();
    set((p) => {
      const flags = [...p.flags];
      if (r.selfHarm) flags.unshift({ id: uid(), date: now, kind: "q10", text: "EPDS question 10 positive: thoughts of self-harm", resolved: false, dueAt: now });
      else if (r.band === "probable") flags.unshift({ id: uid(), date: now, kind: "epds", text: `EPDS ${r.total}: probable depression`, resolved: false, dueAt: new Date(Date.now() + 48 * 3600000).toISOString() });
      return { ...p, epds: [{ date: now, total: r.total, band: r.band, selfHarm: r.selfHarm }, ...p.epds], flags };
    });
    // a positive question 10 is treated as the "care team will be in touch" outcome too, never a low message
    setBand(r.selfHarm ? "probable" : r.band);
    setDir(1); setStep(EPDS.length);
    if (r.selfHarm) openCrisis({ kind: "selfharm", reason: "Your answer to the last question" });
  };

  const pick = (score: number) => {
    if (busy.current) return;
    busy.current = true;
    setChosen(score);
    setTimeout(() => {
      const next = [...ans.slice(0, step), score];
      setAns(next); setChosen(null); busy.current = false;
      if (step < EPDS.length - 1) { setDir(1); setStep(step + 1); } else finish(next);
    }, 240);
  };
  const back = () => { setDir(-1); setChosen(null); setStep(step - 1); };

  const q = EPDS[step];
  const prior = ans[step];
  return (
    <div className="mx-auto max-w-xl">
      <PageHead title="Mind check" sub="A routine wellness check we offer every new mother. It takes 2 minutes." tag="Wellness check" />

      <AnimatePresence mode="wait" initial={false}>
        {step === -1 && (
          <m.div key="intro" {...slide(dir)} className="space-y-4">
            <div className="card space-y-4">
              <Flower2 className="h-9 w-9 text-primary" aria-hidden />
              <p className="text-lg">{tr("Feeling low, worried or overwhelmed after birth is very common, and it is treatable. These 10 questions help your care team support you. There are no right or wrong answers.")}</p>
              <p className="text-sm text-ink-muted">{tr("Think about how you have felt")} <b>{tr("in the past 7 days")}</b>{tr(", not just today.")}</p>
              <m.button whileTap={tap} className="btn-primary w-full !py-3.5 text-base" onClick={() => { setAns([]); setDir(1); setStep(0); }}>{tr("Start (2 minutes)")}</m.button>
            </div>
            <div className="card">
              <h2 className="mb-2 font-serif text-xl">{tr("When we offer it")}</h2>
              <ul className="space-y-2 text-sm">
                {EPDS_SCHEDULE.map((e) => (
                  <li key={e.label} className="flex justify-between"><span>{tr(e.label)}</span><span className={e.day <= age ? "font-bold text-ok" : "text-ink-muted"}>{e.day <= age ? tr("due now") : tr("in {n} days", { n: e.day - age })}</span></li>
                ))}
              </ul>
            </div>
            {s.epds.length > 0 && (
              <div className="card">
                <h2 className="mb-2 font-serif text-xl">{tr("Your past checks")}</h2>
                {s.epds.map((e) => <div key={e.date} className="flex justify-between border-b border-line py-2 text-sm last:border-0"><span>{fmtDate(e.date)}</span><span>{e.band === "low" && !e.selfHarm ? tr("Doing well") : tr("Your care team is in touch")}</span></div>)}
              </div>
            )}
            <a href="tel:14416" className="card flex items-center gap-3 !p-4"><Phone className="h-5 w-5 shrink-0 text-ok" aria-hidden /><span className="text-sm"><b>{tr("Free help any time:")}</b> {tr("Tele-MANAS")} 14416 ({tr("24×7")})</span></a>
            <p className="text-xs text-ink-muted">{tr("Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987). Hindi wording: translation pending clinician review.")}</p>
            <Disclaimer>This check is screening support, not a diagnosis.</Disclaimer>
          </m.div>
        )}

        {step >= 0 && step < EPDS.length && (
          <m.div key={`q${step}`} {...slide(dir)} className="card space-y-5">
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-line"><m.div className="h-full rounded-full bg-primary-fill" initial={false} animate={{ width: `${((step + 1) / EPDS.length) * 100}%` }} transition={spring.gentle} /></div>
            <p className="text-sm font-semibold text-ink-muted">{tr("Question {a} of {b}", { a: step + 1, b: EPDS.length })}</p>
            <h2 id="q" className="font-serif text-[1.65rem] leading-snug">{tr(q.q)}</h2>
            <m.div role="radiogroup" aria-labelledby="q" variants={stagger()} initial="hidden" animate="show" className="space-y-2.5">
              {q.options.map((o) => {
                const on = chosen === o.score || (chosen === null && prior === o.score);
                return (
                  <m.button key={o.text} variants={rise} whileTap={tap} role="radio" aria-checked={on} onClick={() => pick(o.score)}
                    className={`flex min-h-[60px] w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left text-base font-semibold ${on ? "border-primary bg-plum-100 text-plum-800" : "border-line bg-surface hover:bg-surface-2"}`}>
                    <span>{tr(o.text)}</span>{on && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
                  </m.button>
                );
              })}
            </m.div>
            {step > 0 && <button className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-primary" onClick={back}><ArrowLeft className="h-4 w-4" aria-hidden />{tr("Back")}</button>}
          </m.div>
        )}

        {step === EPDS.length && band && (
          <m.div key="result" {...slide(1)} className="space-y-4">
            {band === "low" && (
              <div className="card space-y-2 border-ok/40 bg-ok/10"><h2 className="font-serif text-2xl">{tr("Thank you for sharing.")}</h2><p className="text-lg">{tr("You seem to be coping well right now. Keep talking, keep resting, and keep checking in. We will remind you before your next check.")}</p></div>
            )}
            {band === "possible" && (
              <div className="card space-y-3">
                <h2 className="font-serif text-2xl">{tr("Thank you for sharing.")}</h2>
                <p className="text-lg">{tr("Many mothers feel this way, and support makes a real difference. We suggest talking to a counsellor, and we will offer this check again in 2 weeks.")}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/care" className="btn-primary flex-1"><HeartHandshake className="h-4 w-4" aria-hidden />{tr("Talk to a counsellor")}</Link>
                  <a href="tel:14416" className="btn-ghost flex-1">{tr("Free: Tele-MANAS")} 14416</a>
                </div>
              </div>
            )}
            {band === "probable" && (
              <div className="card flex flex-col items-center gap-5 py-10 text-center">
                <m.div animate={{ scale: [1, 1.07, 1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="flex h-24 w-24 items-center justify-center rounded-full bg-plum-100" aria-hidden><HeartHandshake className="h-10 w-10 text-primary" /></m.div>
                <h2 className="font-serif text-3xl leading-snug">{tr("Our care team will be in touch.")}</h2>
              </div>
            )}
            {band !== "low" && (
              <a href="tel:14416" className="card flex items-center gap-3 border-ok/40 bg-ok/10"><Phone className="h-6 w-6 shrink-0 text-ok" aria-hidden /><span><b>{tr("Want to talk sooner?")}</b> {tr("Tele-MANAS")} 14416: {tr("free, 24×7, 20 languages.")}</span></a>
            )}
            <button className="btn-ghost w-full" onClick={() => { setDir(-1); setStep(-1); setBand(null); }}>{tr("Done")}</button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
