"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { CircleHelp, Cloud, Loader2, MessageCircleQuestion, Phone, Send, ShieldQuestion, Sparkles, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { redFlagCheck, CrisisKind } from "@/lib/triage";
import { Topic } from "@/lib/ask/knowledge";
import { findAnswer } from "@/lib/ask/client";
import { PageHead, Disclaimer } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { rise, tap } from "@/lib/motion";

type Msg =
  | { k: "you"; text: string }
  | { k: "answer"; topic: Topic; source: "device" | "cloud" | "picked" }
  | { k: "pick"; options: Topic[]; text: string }
  | { k: "none" }
  | { k: "confirm"; reason: string; kind: CrisisKind; text: string };

const EXAMPLES_MOTHER = ["How long will the bleeding last?", "my baby is turning yellow", "stan mein dard aur doodh kam hai", "What should I eat after delivery?"];
const EXAMPLES_FAMILY = ["How can I help her tonight?", "She is crying a lot since the baby came", "bahu ko neend nahi aati"];

export default function Ask() {
  const { s, auth, openCrisis } = useApp();
  const act = useActions();
  const tr = useTr();
  const hi = s.lang === "hi";
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const cloudOk = s.consent.cloudMatch === true;
  const examples = auth.role === "family" ? EXAMPLES_FAMILY : EXAMPLES_MOTHER;

  useEffect(() => {
    if (!msgs.length) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "end" });
  }, [msgs.length]);

  const raise = (reason: string, kind: CrisisKind) => { void act.reportEmergency(kind, reason); openCrisis({ kind, reason }); };
  const add = (...x: Msg[]) => setMsgs((p) => [...p, ...x]);

  const run = async (t: string) => {
    setBusy(true);
    const out = await findAnswer(t, cloudOk);
    setBusy(false);
    if (out.answer) return add({ k: "answer", topic: out.answer, source: out.source === "cloud" ? "cloud" : "device" });
    if (out.maybe.length) return add({ k: "pick", options: out.maybe, text: t });
    add({ k: "none" });
  };

  const submit = async (q?: string) => {
    const t = (q ?? text).trim();
    if (!t || busy) return;
    setText("");
    add({ k: "you", text: t });
    const flag = redFlagCheck(t); // 1. emergency check first, on the phone, before anything else
    if (flag) {
      if (flag.negated && flag.kind !== "selfharm") return add({ k: "confirm", reason: flag.reason, kind: flag.kind, text: t });
      return raise(flag.reason, flag.kind);
    }
    await run(t);
  };

  const body = (t: Topic) => (hi ? t.hi_answer : t.answer);
  const watch = (t: Topic) => (hi ? t.hi_watch : t.watch);
  const title = (t: Topic) => (hi ? t.hi_title : t.title);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="Ask Bloom" sub="Ask an everyday question in English, Hindi or Hinglish. Every answer was written in advance by our team. Nothing is made up, and if we do not have a reviewed answer we say so." tag="Your questions" />

      <div className="space-y-4">
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

        <div className="card min-h-[280px] space-y-4" aria-live="polite">
          {!msgs.length && (
            <div className="flex items-start gap-3 text-ink-muted">
              <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <p>{tr("Hello, I am Bloom. Ask me anything about your recovery, your baby or how to support a new mother.")}</p>
            </div>
          )}

          {msgs.map((x, i) => (
            <m.div key={i} variants={rise} initial="hidden" animate="show" className={x.k === "you" ? "flex justify-end" : ""}>
              {x.k === "you" && <p className="max-w-[85%] rounded-2xl rounded-br-md bg-plum-800 px-4 py-2.5 text-white">{x.text}</p>}

              {x.k === "answer" && (
                <article className="space-y-3 rounded-2xl rounded-bl-md border border-plum-100 bg-surface-2 p-4">
                  <h2 className="font-serif text-xl text-plum-900">{title(x.topic)}</h2>
                  <p className="text-base leading-relaxed text-ink">{body(x.topic)}</p>
                  {watch(x.topic) && (
                    <p className="flex items-start gap-2 rounded-control border border-warn/50 bg-warn/10 p-3 text-sm text-ink"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden /><span><b>{tr("When to see a doctor")}:</b> {watch(x.topic)}</span></p>
                  )}
                  {x.topic.link && <Link href={x.topic.link.href} className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">{tr(x.topic.link.label)}</Link>}
                  <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Sparkles className="h-3.5 w-3.5" aria-hidden />{tr("Written in advance by our team, not by AI. Not a diagnosis.")}</p>
                </article>
              )}

              {x.k === "pick" && (
                <div className="space-y-2 rounded-2xl rounded-bl-md border border-plum-100 bg-surface-2 p-4">
                  <p className="font-bold text-plum-800">{tr("Did you mean…?")}</p>
                  {x.options.map((o) => <m.button key={o.id} whileTap={tap} className="block min-h-[48px] w-full rounded-control border border-line bg-surface px-4 py-3 text-left font-semibold text-plum-800 hover:bg-plum-100" onClick={() => add({ k: "answer", topic: o, source: "picked" })}>{title(o)}</m.button>)}
                  <button className="min-h-[44px] text-sm font-semibold text-primary underline underline-offset-4" onClick={() => add({ k: "none" })}>{tr("None of these")}</button>
                </div>
              )}

              {x.k === "none" && (
                <div className="space-y-3 rounded-2xl rounded-bl-md border border-warn/50 bg-warn/10 p-4">
                  <p className="font-bold text-ink">{tr("I do not have a reviewed answer for that, and I never guess.")}</p>
                  <p className="text-sm text-ink-muted">{tr("Please ask a doctor, or use the symptom checker if something feels wrong in your body.")}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link href="/check" className="btn-primary flex-1">{tr("Symptom checker")}</Link>
                    <Link href="/care" className="btn-ghost flex-1">{tr("Book a session")}</Link>
                  </div>
                  <a href="tel:14416" className="flex min-h-[44px] items-center justify-center gap-2 text-sm font-semibold text-plum-800 underline underline-offset-4"><Phone className="h-4 w-4" aria-hidden />{tr("Free help: Tele-MANAS")} 14416</a>
                </div>
              )}

              {x.k === "confirm" && (
                <div className="rounded-2xl rounded-bl-md border border-warn/50 bg-warn/10 p-4">
                  <p className="flex items-center gap-2 font-bold text-ink"><ShieldQuestion className="h-5 w-5 text-warn" aria-hidden />{tr("Just checking")}</p>
                  <p className="mt-1 text-lg text-ink">{tr("It sounds like you may have said you do not have this. Do you have: {r}?", { r: tr(x.reason) })}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button className="btn-primary flex-1 !bg-danger" onClick={() => raise(x.reason, x.kind)}>{tr("Yes, I have this")}</button>
                    <button className="btn-ghost flex-1" disabled={busy} onClick={() => run(x.text)}>{tr("No, I do not")}</button>
                  </div>
                </div>
              )}
            </m.div>
          ))}

          {busy && <p className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{tr("Looking for the right answer…")}</p>}
          <div ref={endRef} />
        </div>

        <div className="card space-y-3">
          <label htmlFor="ask" className="block text-sm font-bold text-plum-800">{tr("Your question")}</label>
          <textarea id="ask" className="input min-h-[88px] resize-y" value={text} maxLength={300} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
            placeholder={tr("e.g. How long will the bleeding last?")} />
          <m.button whileTap={tap} className="btn-primary w-full !py-3.5 text-base" onClick={() => submit()} disabled={!text.trim() || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}{tr("Ask")}
          </m.button>
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Try an example")}</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{examples.map((e) => <button key={e} className="chip shrink-0 whitespace-nowrap" onClick={() => submit(e)}>{e}</button>)}</div>
          </div>
        </div>

        <p className="flex items-start gap-2 text-sm text-ink-muted"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{tr("If something feels wrong in your body right now, use the symptom checker or call 112. This page is for everyday questions.")}</p>
      </div>
      <Disclaimer />
    </div>
  );
}
