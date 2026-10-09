"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { ChevronDown, CircleHelp, Cloud, Heart, Loader2, Mic, Send, ShieldQuestion, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { redFlagCheck, followUpsFor, resolveCase, FuItem, CrisisKind } from "@/lib/triage";
import { PSYCHOSIS_SIGNS, Symptom, SYMPTOMS, Level, bySymptomId } from "@/lib/symptoms";
import { AREA_LABELS } from "@/lib/symptoms-extra";
import { findSymptoms } from "@/lib/match/client";
import { Candidate } from "@/lib/match/engine";
import { PageHead, Disclaimer, Segmented } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { TriageResult } from "@/components/TriageResult";
import { rise, stagger, tap } from "@/lib/motion";

type Final = { level: Level; symptoms: Symptom[]; reasons: string[]; source: "device" | "cloud" };
type View =
  | { k: "empty" }
  | { k: "confirm"; reason: string; kind: CrisisKind; text: string }
  | { k: "pick"; options: Candidate[]; text: string; source: "device" | "cloud" }
  | { k: "ask"; picked: Symptom[]; items: FuItem[]; answers: number[]; text: string; source: "device" | "cloud" }
  | { k: "none" }
  | { k: "done"; res: Final };

const EXAMPLES = ["I have fever and my stitches are hurting a lot", "sar mein bahut dard aur dhundhla dikh raha hai", "feeling very tired and some cramps", "baby not feeding well"];
const NOT_SURE = -2;

export default function Check() {
  const { s, openCrisis } = useApp();
  const act = useActions();
  const tr = useTr();
  const [who, setWho] = useState<"mother" | "baby">("mother");
  const [text, setText] = useState("");
  const [view, setView] = useState<View>({ k: "empty" });
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const cloudOk = s.consent.cloudMatch === true;

  useEffect(() => () => rec.current?.stop?.(), []);

  // saving the result also gives back the saved row, so the server can group this alert with her others before deciding who to tell
  const log = (level: Level, labels: string[], _t: string) => act.logSymptom(level, labels).catch(() => null);

  // The crisis screen opens at once from the phone. Alerting her professional and (if she agreed) her family happens in the background.
  const raiseRed = (reason: string, kind: CrisisKind, saved?: ReturnType<typeof log>) => {
    void act.reportEmergency(kind, reason, saved);
    openCrisis({ kind, reason });
  };

  // bring the card into view when it changes (on a phone it sits below the form)
  const viewKey = view.k + (view.k === "ask" ? view.answers.length : "");
  useEffect(() => {
    if (view.k === "empty") return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
  }, [viewKey]); // eslint-disable-line

  const finalize = (picked: Symptom[], items: FuItem[], answers: number[], t: string, source: "device" | "cloud") => {
    const r = resolveCase(picked, items, answers);
    const saved = log(r.level, r.symptoms.map((x) => x.label), t);
    setView({ k: "done", res: { level: r.level, symptoms: r.symptoms, reasons: r.reasons, source } });
    if (r.level === "RED") {
      const why = [...r.symptoms.filter((x) => x.level === "RED").map((x) => x.label), ...r.reasons].join(", ") || "Danger sign";
      raiseRed(why, r.crisis ?? (r.symptoms.some((x) => x.id === "self_harm") ? "selfharm" : "medical"), saved);
    }
  };

  const startAsk = (picked: Symptom[], t: string, source: "device" | "cloud") => {
    const items = followUpsFor(picked);
    if (!items.length) return finalize(picked, [], [], t, source);
    setView({ k: "ask", picked, items, answers: [], text: t, source });
  };

  const runMatch = async (t: string) => {
    setBusy(true);
    const out = await findSymptoms(t, who, cloudOk);
    setBusy(false);
    if (out.safety === "selfharm") { const saved = log("RED", ["Thoughts of self-harm"], t); raiseRed("Thoughts of self-harm", "selfharm", saved); }
    if (out.auto.length) return startAsk(out.auto, t, out.source);
    if (out.maybe.length) return setView({ k: "pick", options: out.maybe, text: t, source: out.source });
    setView({ k: "none" });
  };

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    const flag = redFlagCheck(t); // 1. emergency check first, on the phone, before anything else
    if (flag) {
      if (flag.negated && flag.kind !== "selfharm") return setView({ k: "confirm", reason: flag.reason, kind: flag.kind, text: t });
      const saved = log("RED", [flag.reason], t);
      setView({ k: "done", res: { level: "RED", symptoms: [], reasons: [flag.reason], source: "device" } });
      return raiseRed(flag.reason, flag.kind, saved);
    }
    await runMatch(t);
  };

  const mic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert(tr("Voice input is not supported in this browser. Please type."));
    if (listening) return rec.current?.stop();
    const r = new SR();
    r.lang = s.lang === "hi" ? "hi-IN" : "en-IN";
    r.onresult = (e: any) => setText((x) => (x ? x + " " : "") + e.results[0][0].transcript);
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const answer = (v: View & { k: "ask" }, idx: number) => {
    const answers = [...v.answers, idx];
    // an answer that already means an emergency ends the questions straight away
    const e = v.items[answers.length - 1].fu.options[idx]?.effect;
    const urgent = !!e && (!!e.crisis || e.level === "RED" || (!!e.add && bySymptomId(e.add)?.level === "RED"));
    if (urgent) return finalize(v.picked, v.items.slice(0, answers.length), answers, v.text, v.source);
    if (answers.length < v.items.length) return setView({ ...v, answers });
    finalize(v.picked, v.items, answers, v.text, v.source); // idx -2 ("not sure") is handled cautiously in resolveCase
  };

  const pool = SYMPTOMS.filter((x) => x.who === who);
  const areas = Object.entries(AREA_LABELS).filter(([, a]) => a.who === who);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHead title="Is this normal?" sub="Tell us what you feel in English, Hindi or Hinglish. We match your words to known symptoms. The advice is always pre-written and clinician-reviewed." tag="Symptom checker" />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          {s.consent.cloudMatch == null && (
            <div className="card flex items-start gap-3 !p-4">
              <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-plum-800">{tr("Smarter symptom matching (optional)")}</p>
                <p className="mt-1 text-sm text-ink-muted">{tr("Send the words you type (never your name) to our matching service so more ways of describing a symptom are understood. Nothing is stored. Emergency checks always run on your phone first.")}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary !py-2" onClick={() => act.setConsent({ cloudMatch: true })}>{tr("Allow")}</button>
                  <button className="btn-ghost !py-2" onClick={() => act.setConsent({ cloudMatch: false })}>{tr("Not now")}</button>
                </div>
              </div>
            </div>
          )}

          <div className="card space-y-4">
            <Segmented label="Who is this for?" value={who} onChange={(w) => { setWho(w); setView({ k: "empty" }); setArea(null); }} options={[{ id: "mother", label: "For me" }, { id: "baby", label: "For my baby" }]} />
            <div>
              <label htmlFor="sx" className="mb-1.5 block text-sm font-bold text-plum-800">{who === "mother" ? tr("How are you feeling?") : tr("What have you noticed in your baby?")}</label>
              <textarea id="sx" className="input min-h-[120px] resize-y" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder={who === "mother" ? tr("e.g. sar mein bahut dard aur dhundhla dikh raha hai") : tr("e.g. baby not feeding well")} />
            </div>
            <div className="flex gap-2">
              <m.button whileTap={tap} className="btn-primary flex-1 !py-3.5 text-base" onClick={submit} disabled={!text.trim() || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}{busy ? tr("Checking…") : tr("Check")}</m.button>
              <m.button whileTap={tap} className={`btn-soft !px-4 ${listening ? "ring-4 ring-primary/30" : ""}`} onClick={mic} aria-label={listening ? tr("Listening…") : tr("Speak")} aria-pressed={listening}><Mic className="h-5 w-5" aria-hidden /><span className="hidden sm:inline">{listening ? tr("Listening…") : tr("Speak")}</span></m.button>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Try an example")}</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{EXAMPLES.map((e) => <button key={e} className="chip shrink-0 whitespace-nowrap" onClick={() => setText(e)}>{e}</button>)}</div>
            </div>
          </div>

          <div className="card !p-0">
            <button className="flex min-h-[56px] w-full items-center justify-between px-5 text-left font-bold text-plum-800" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
              {tr("Or choose where it hurts or what is wrong")}<ChevronDown className={`h-5 w-5 transition ${showAll ? "rotate-180" : ""}`} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {showAll && (
                <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="space-y-2 px-5 pb-5">
                    <div className="flex flex-wrap gap-2">
                      {areas.map(([k, a]) => <button key={k} className={`chip ${area === k ? "chip-on" : ""}`} aria-pressed={area === k} onClick={() => setArea(area === k ? null : k)}>{tr(a.en)}</button>)}
                    </div>
                    {area && (
                      <m.div key={area} variants={stagger()} initial="hidden" animate="show" className="flex flex-col gap-2 pt-1">
                        {pool.filter((x) => x.area === area).map((x) => (
                          <m.button variants={rise} whileTap={tap} key={x.id} className="min-h-[48px] rounded-control border border-line bg-surface-2 px-4 py-3 text-left font-semibold text-plum-800 hover:bg-plum-100" onClick={() => startAsk([x], x.label, "device")}>{tr(x.label)}</m.button>
                        ))}
                      </m.div>
                    )}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <div ref={resultRef} aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={viewKey} variants={rise} initial="hidden" animate="show" exit="exit">
                {view.k === "empty" && (
                  <div className="card flex items-start gap-3 border-dashed text-ink-muted"><CircleHelp className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><p>{tr("Your result will appear here. Describe how you feel, or pick a symptom from the list.")}</p></div>
                )}

                {view.k === "confirm" && (
                  <div className="card border-warn/50 bg-warn/10">
                    <p className="flex items-center gap-2 font-bold text-ink"><ShieldQuestion className="h-5 w-5 text-warn" aria-hidden />{tr("Just checking")}</p>
                    <p className="mt-1 text-lg text-ink">{tr("It sounds like you may have said you do not have this. Do you have: {r}?", { r: tr(view.reason) })}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button className="btn-primary flex-1 !bg-danger" onClick={() => { log("RED", [view.reason], view.text); setView({ k: "done", res: { level: "RED", symptoms: [], reasons: [view.reason], source: "device" } }); raiseRed(view.reason, view.kind); }}>{tr("Yes, I have this")}</button>
                      <button className="btn-ghost flex-1" onClick={() => runMatch(view.text)}>{tr("No, I do not")}</button>
                    </div>
                  </div>
                )}

                {view.k === "pick" && (
                  <div className="card">
                    <h2 className="mb-1 font-serif text-xl">{tr("Did you mean…?")}</h2>
                    <p className="mb-3 text-sm text-ink-muted">{tr("Tap the one that fits best.")}</p>
                    <m.div variants={stagger()} initial="hidden" animate="show" className="flex flex-col gap-2">
                      {view.options.map((c) => <m.button variants={rise} whileTap={tap} key={c.symptom.id} className="min-h-[52px] rounded-control border border-line bg-surface-2 px-4 py-3 text-left font-semibold text-plum-800 hover:bg-plum-100" onClick={() => startAsk([c.symptom], view.text, view.source)}>{tr(c.symptom.label)}</m.button>)}
                    </m.div>
                    <button className="mt-3 min-h-[44px] text-sm font-semibold text-primary underline underline-offset-4" onClick={() => setView({ k: "none" })}>{tr("None of these")}</button>
                  </div>
                )}

                {view.k === "ask" && (() => {
                  const i = view.answers.length, it = view.items[i];
                  return (
                    <div className="card">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("A few quick questions")} · {i + 1}/{view.items.length}</p>
                      <h2 className="font-serif text-2xl leading-snug">{tr(it.fu.q)}</h2>
                      <m.div key={it.fu.q} variants={stagger()} initial="hidden" animate="show" className="mt-4 flex flex-col gap-2" role="group" aria-label={tr(it.fu.q)}>
                        {it.fu.options.map((o, idx) => (
                          <m.button variants={rise} whileTap={tap} key={o.label} className="min-h-[52px] rounded-control border-2 border-line bg-surface px-4 py-3 text-left font-semibold text-plum-800 hover:bg-surface-2" onClick={() => answer(view, idx)}>{tr(o.label)}</m.button>
                        ))}
                        <m.button variants={rise} whileTap={tap} className="min-h-[44px] text-left text-sm font-semibold text-ink-muted underline underline-offset-4" onClick={() => answer(view, NOT_SURE)}>{tr("I am not sure")}</m.button>
                      </m.div>
                      {i > 0 && <button className="mt-2 min-h-[44px] text-sm font-bold text-primary" onClick={() => setView({ ...view, answers: view.answers.slice(0, -1) })}>← {tr("Back")}</button>}
                    </div>
                  );
                })()}

                {view.k === "none" && (
                  <div className="card border-warn/50 bg-warn/10">
                    <p className="font-bold text-ink">{tr("We could not match this to a known symptom, and we never guess.")}</p>
                    <p className="mt-1 text-sm text-ink-muted">{tr("Please speak to a doctor about this.")}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Link href="/care" className="btn-primary flex-1">{tr("Book a session")}</Link>
                      <a href="tel:14416" className="btn-ghost flex-1">{tr("Free help: Tele-MANAS")} 14416</a>
                    </div>
                    <a href="tel:112" className="mt-2 flex min-h-[44px] items-center justify-center rounded-full bg-danger/10 px-4 font-bold text-danger">{tr("If this feels like an emergency, call 112")}</a>
                    <p className="mt-3 text-xs text-ink-muted">{tr("Tip: try fewer words, or choose from the list.")}</p>
                  </div>
                )}

                {view.k === "done" && (
                  <div className="space-y-3">
                    <TriageResult level={view.res.level} symptoms={view.res.symptoms} reasons={view.res.reasons} />
                    {view.res.level !== "RED" && view.res.symptoms.some((x) => x.area === "mind") && (
                      <Link href="/screening" className="card flex items-center gap-3 !p-4 font-semibold text-plum-800"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-plum-100 text-primary"><Heart className="h-5 w-5" aria-hidden /></span>{tr("Take the Mind check, a 2-minute wellness check")}</Link>
                    )}
                    <p className="text-xs text-ink-muted">{view.res.source === "cloud" ? tr("Matched with smarter matching.") : tr("Matched on your phone.")}</p>
                  </div>
                )}
              </m.div>
            </AnimatePresence>
          </div>

          <div className="card border-danger/30">
            <h2 className="flex items-center gap-2 font-serif text-xl"><TriangleAlert className="h-5 w-5 text-danger" aria-hidden />{tr("Mind warning signs: you or your family can tap")}</h2>
            <p className="mb-3 mt-1 text-sm text-ink-muted">{tr("If any of these apply, tap it. We will tell you what to do right away.")}</p>
            <div className="flex flex-wrap gap-2">{PSYCHOSIS_SIGNS.map((x) => <button key={x} className="chip text-left" onClick={() => raiseRed(x, "psychosis")}>{tr(x)}</button>)}</div>
          </div>
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}
