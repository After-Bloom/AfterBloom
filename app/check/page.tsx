"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, TriangleAlert } from "lucide-react";
import { useApp, uid } from "@/lib/store";
import { redFlagCheck, matchSymptoms, triage, Match } from "@/lib/triage";
import { PSYCHOSIS_SIGNS, Symptom, SYMPTOMS, Level } from "@/lib/symptoms";
import { PageHead, Disclaimer } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { TriageResult } from "@/components/TriageResult";

type Result = { level: Level; symptoms: Symptom[] } | { none: true } | { maybe: Match[] };
const EXAMPLES = ["I have fever and my stitches are hurting a lot", "sar mein bahut dard aur dhundhla dikh raha hai", "feeling very tired and some cramps", "baby not feeding well"];

export default function Check() {
  const { s, set, openCrisis, alertFamily } = useApp();
  const tr = useTr();
  const [who, setWho] = useState<"mother" | "baby">("mother");
  const [text, setText] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [listening, setListening] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const rec = useRef<any>(null);

  useEffect(() => () => rec.current?.stop?.(), []);

  const log = (level: Level, labels: string[], t: string) =>
    set((p) => ({ ...p, symptomLogs: [{ date: new Date().toISOString(), text: t, level, labels }, ...p.symptomLogs] }));

  const raiseRed = (reason: string, kind: "medical" | "selfharm" | "psychosis") => {
    if (kind !== "psychosis") alertFamily(`RED alert for ${s.mother.name}: ${reason}`);
    set((p) => ({ ...p, flags: [{ id: uid(), date: new Date().toISOString(), kind: kind === "selfharm" ? "selfharm" : "red", text: reason, resolved: false, dueAt: new Date(Date.now() + 3600000).toISOString() }, ...p.flags] }));
    openCrisis({ kind, reason });
  };

  const decide = (picked: Symptom[], t: string) => {
    const level = triage(picked);
    log(level, picked.map((x) => x.label), t);
    setRes({ level, symptoms: picked });
    if (level === "RED") raiseRed(picked.filter((x) => x.level === "RED").map((x) => x.label).join(", "), picked.some((x) => x.id === "self_harm") ? "selfharm" : "medical");
  };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    const flag = redFlagCheck(t); // 1. red flags first, before any matching
    if (flag) {
      log("RED", [flag.reason], t);
      setRes({ level: "RED", symptoms: [] });
      raiseRed(flag.reason, flag.kind);
      return;
    }
    const { auto, maybe } = matchSymptoms(t); // 2. matching, 3. confidence check
    if (auto.length) decide(auto.map((m) => m.symptom), t);
    else if (maybe.length) setRes({ maybe });
    else setRes({ none: true });
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

  const pool = SYMPTOMS.filter((x) => x.who === who);

  return (
    <div className="max-w-6xl">
      <PageHead title="Is this normal?" sub="Tell us what you feel in English, Hindi or Hinglish. We match your words to known symptoms. The advice is always pre-written and clinician-reviewed, never AI-written." tag="Symptom checker" />

      <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="card space-y-3">
        <div className="flex gap-2">
          {(["mother", "baby"] as const).map((w) => <button key={w} onClick={() => { setWho(w); setRes(null); }} className={`chip ${who === w ? "chip-on" : ""}`}>{w === "mother" ? tr("For me") : tr("For my baby")}</button>)}
        </div>
        <textarea className="input min-h-[110px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={who === "mother" ? tr("e.g. I have fever and my stitches are hurting a lot") : tr("e.g. baby not feeding well")} />
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={submit}><Send className="h-4 w-4" />{tr("Check")}</button>
          <button className={`btn-soft ${listening ? "!bg-red-100" : ""}`} onClick={mic} aria-label="Speak"><Mic className="h-4 w-4" />{listening ? tr("Listening…") : tr("Speak")}</button>
        </div>
        <div className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} className="chip text-left" onClick={() => setText(e)}>{e}</button>)}</div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1">
        {!res && <div className="card border-dashed text-plum-900/60">{tr("Your result will appear here. Describe how you feel, or pick a symptom from the list.")}</div>}
        {res && "level" in res && <TriageResult level={res.level} symptoms={res.symptoms} />}
        {res && "maybe" in res && (
          <div className="card">
            <h3 className="font-bold mb-2">{tr("Did you mean…?")}</h3>
            <div className="flex flex-wrap gap-2">{res.maybe.map((m) => <button key={m.symptom.id} className="chip" onClick={() => decide([m.symptom], text)}>{tr(m.symptom.label)}</button>)}</div>
            <button className="mt-3 text-sm underline text-plum-700" onClick={() => setRes({ none: true })}>{tr("None of these")}</button>
          </div>
        )}
        {res && "none" in res && (
          <div className="card border-amber-300 bg-amber-50">
            <p className="font-semibold">{tr("We could not match this to a known symptom, and we never guess.")}</p>
            <p className="text-sm mt-1">{tr("Please speak to a doctor about this.")}</p>
            <Link href="/care" className="btn-primary mt-3 inline-flex">{tr("Book a session")}</Link>
          </div>
        )}
      </div>

      <div className="card">
        <button className="flex w-full items-center justify-between text-left font-semibold" onClick={() => setShowAll(!showAll)}>{tr("Or pick from the list")} <span>{showAll ? "−" : "+"}</span></button>
        {showAll && <div className="mt-3 flex flex-wrap gap-2">{pool.map((x) => <button key={x.id} className="chip" onClick={() => decide([x], x.label)}>{tr(x.label)}</button>)}</div>}
      </div>

      <div className="card border-plum-300">
        <h3 className="font-bold flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-red-600" />{tr("Mind warning signs: you or your family can tap")}</h3>
        <p className="text-sm text-plum-900/70 mb-3">{tr("If any of these apply, tap it. We will tell you what to do right away.")}</p>
        <div className="flex flex-wrap gap-2">{PSYCHOSIS_SIGNS.map((x) => <button key={x} className="chip text-left" onClick={() => raiseRed(x, "psychosis")}>{tr(x)}</button>)}</div>
      </div>
      </div>
      <Disclaimer />
    </div>
  );
}
