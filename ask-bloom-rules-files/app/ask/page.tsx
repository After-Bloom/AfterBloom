"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { CircleHelp, Inbox, Loader2, MessageCircleQuestion, Mic, MicOff, Phone, Send, ShieldQuestion, Sparkles, Square, TriangleAlert, UserRound, Volume2 } from "lucide-react";
import { useApp, daysSince } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { supabase } from "@/lib/supabase/client";
import { redFlagCheck, CrisisKind } from "@/lib/triage";
import { TOPICS, Topic } from "@/lib/ask/knowledge";
import { decide, decideMany } from "@/lib/ask/match";
import { personalLine, Profile } from "@/lib/ask/personal";
import { CATEGORIES, META, STAGES, Category, Stage, relatedTo, stageOf } from "@/lib/ask/browse";
import { PageHead, Disclaimer, Tabs, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { rise, tap } from "@/lib/motion";

// Ask Bloom: everyday questions, answered ONLY from prewritten, reviewed answers. No AI anywhere on this page.
// Order for every question: 1. emergency check on the phone  2. rules-only matching  3. answer, "Did you mean", clarify, or "no answer".
type Msg =
  | { k: "you"; text: string }
  | { k: "answer"; topics: Topic[]; via: "match" | "picked" | "browse" }
  | { k: "pick"; options: Topic[]; text: string }
  | { k: "who"; text: string }
  | { k: "none"; text: string; near: string | null }
  | { k: "sent" }
  | { k: "confirm"; reason: string; kind: CrisisKind; text: string };

type MyQ = { id: string; question: string | null; reply: string | null; status: string; createdAt: string; repliedAt: string | null };

const EXAMPLES_MOTHER = ["How long will the bleeding last?", "my baby is turning yellow", "stan mein dard aur doodh kam hai", "I have cramps and my baby will not sleep"];
const EXAMPLES_FAMILY = ["How can I help her tonight?", "She is crying a lot since the baby came", "bahu ko neend nahi aati"];

/** Anonymous count for the admin page: which topic, what happened. Never the words. */
const count = (topic: string, outcome: string) => { void supabase().rpc("bump_ask_stat", { p_topic: topic, p_outcome: outcome }).then(() => {}, () => {}); };

export default function Ask() {
  const { s, auth, openCrisis } = useApp();
  const act = useActions();
  const tr = useTr();
  const hi = s.lang === "hi";
  const isMother = auth.role === "mother";
  const [tab, setTab] = useState("ask");
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [mine, setMine] = useState<MyQ[]>([]);
  const [sending, setSending] = useState(false);
  const rec = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const examples = auth.role === "family" ? EXAMPLES_FAMILY : EXAMPLES_MOTHER;

  // her profile fills the blanks in personal lines ("You are on day 9 after a C-section")
  const profile: Profile | null = useMemo(() => (isMother ? { role: "mother", delivery: s.mother.delivery, day: daysSince(s.mother.birth), babyName: s.mother.babyName, risk: s.risk } : null), [isMother, s.mother, s.risk]);

  useEffect(() => {
    if (!msgs.length) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "end" });
  }, [msgs.length]);

  // her questions to the care team, and live replies
  const loadMine = async () => { if (!isMother) return; const r = await fetch("/api/ask/human", { cache: "no-store" }).catch(() => null); if (r?.ok) setMine((await r.json()).items); };
  useEffect(() => {
    if (!isMother || !auth.userId) return;
    void loadMine();
    const sb = supabase();
    const ch = sb.channel(`askq:${auth.userId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "ask_questions", filter: `mother_id=eq.${auth.userId}` }, () => void loadMine()).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [isMother, auth.userId]); // eslint-disable-line

  useEffect(() => () => { try { speechSynthesis.cancel(); } catch {} }, []); // stop reading aloud when she leaves the page

  const raise = (reason: string, kind: CrisisKind) => { void act.reportEmergency(kind, reason); openCrisis({ kind, reason }); };
  const add = (...x: Msg[]) => setMsgs((p) => [...p, ...x]);

  /** Rules-only matching. Runs on the phone, works offline, sends nothing anywhere. */
  const run = (t: string, only?: (x: Topic) => boolean) => {
    if (only) { // after "About me / About my baby"
      const o = decide(t, only);
      if (o.answer) { count(o.answer.id, "answer"); return add({ k: "answer", topics: [o.answer], via: "match" }); }
      if (o.maybe.length) { count(o.maybe[0].id, "maybe"); return add({ k: "pick", options: o.maybe, text: t }); }
      count("-", "none"); return add({ k: "none", text: t, near: o.ranked[0]?.id ?? null });
    }
    const o = decideMany(t);
    if (o.clarify === "who") { count(o.ranked[0]?.id ?? "-", "clarify"); return add({ k: "who", text: t }); }
    if (o.answers.length) {
      o.answers.forEach((a) => count(a.id, o.answers.length > 1 ? "multi" : "answer"));
      add({ k: "answer", topics: o.answers, via: "match" });
      if (o.maybe.length) add({ k: "pick", options: o.maybe, text: t });
      return;
    }
    if (o.maybe.length) { count(o.maybe[0].id, "maybe"); return add({ k: "pick", options: o.maybe, text: t }); }
    count("-", "none");
    add({ k: "none", text: t, near: o.ranked[0]?.id ?? null });
  };

  const submit = (q?: string) => {
    const t = (q ?? text).trim();
    if (!t) return;
    setText("");
    setTab("ask");
    add({ k: "you", text: t });
    const flag = redFlagCheck(t); // 1. emergency check first, on the phone, before anything else (unchanged)
    if (flag) {
      if (flag.negated && flag.kind !== "selfharm") return add({ k: "confirm", reason: flag.reason, kind: flag.kind, text: t });
      return raise(flag.reason, flag.kind);
    }
    run(t);
  };

  const openTopic = (t: Topic, via: "picked" | "browse") => { count(t.id, via); setTab("ask"); add({ k: "answer", topics: [t], via }); };

  const mic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert(tr("Voice input is not supported in this browser. Please type."));
    if (listening) return rec.current?.stop();
    const r = new SR();
    r.lang = hi ? "hi-IN" : "en-IN";
    r.onresult = (e: any) => setText((x) => (x ? x + " " : "") + e.results[0][0].transcript);
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const body = (t: Topic) => (hi ? t.hi_answer : t.answer);
  const watch = (t: Topic) => (hi ? t.hi_watch : t.watch);
  const title = (t: Topic) => (hi ? t.hi_title : t.title);
  const byId = (id: string) => TOPICS.find((x) => x.id === id);

  /** Read an answer aloud with the phone's own voice (no network). */
  const speak = (t: Topic, line: string | null) => {
    try {
      if (speaking === t.id) { speechSynthesis.cancel(); return setSpeaking(null); }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance([line, title(t), body(t), watch(t) ? `${tr("When to see a doctor")}: ${watch(t)}` : ""].filter(Boolean).join(". "));
      u.lang = hi ? "hi-IN" : "en-IN";
      const v = speechSynthesis.getVoices().find((x) => x.lang.replace("_", "-").startsWith(hi ? "hi" : "en-IN"));
      if (v) u.voice = v;
      u.onend = () => setSpeaking(null);
      setSpeaking(t.id);
      speechSynthesis.speak(u);
    } catch { alert(tr("Reading aloud is not supported in this browser.")); }
  };

  const sendToTeam = async (t: string, near: string | null) => {
    setSending(true);
    const r = await fetch("/api/ask/human", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t, nearTopic: near, lang: s.lang }) }).catch(() => null);
    setSending(false);
    if (r?.status === 409) return raise("Thoughts of self-harm", "selfharm"); // the server found crisis words: never park them in a queue
    if (!r?.ok) return alert(tr("Could not send. Please try again, or call Tele-MANAS 14416."));
    add({ k: "sent" });
    void loadMine();
  };
  const shareGap = (t: string, near: string | null) => { void fetch("/api/ask/gap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t, nearTopic: near, lang: s.lang }) }).catch(() => {}); };

  const answerCard = (t: Topic) => {
    const line = personalLine(t.id, profile, hi ? "hi" : "en");
    const rel = relatedTo(t.id).map(byId).filter(Boolean) as Topic[];
    return (
      <article key={t.id} className="space-y-3 rounded-2xl rounded-bl-md border border-plum-100 bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif text-xl text-plum-900">{title(t)}</h2>
          <button onClick={() => speak(t, line)} aria-label={speaking === t.id ? tr("Stop reading") : tr("Read aloud")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-plum-100">
            {speaking === t.id ? <Square className="h-4 w-4" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
          </button>
        </div>
        {line && <p className="flex items-start gap-2 rounded-control bg-plum-100/60 p-3 text-sm font-semibold text-plum-800"><UserRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{line}</p>}
        <p className="text-base leading-relaxed text-ink">{body(t)}</p>
        {watch(t) && <p className="flex items-start gap-2 rounded-control border border-warn/50 bg-warn/10 p-3 text-sm text-ink"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden /><span><b>{tr("When to see a doctor")}:</b> {watch(t)}</span></p>}
        {t.call?.length ? <div className="flex flex-wrap gap-2">{t.call.map((c) => <a key={c.number} href={`tel:${c.number}`} className="btn-primary !py-2"><Phone className="h-4 w-4" aria-hidden />{hi ? c.hi_label : c.label} {c.number}</a>)}</div> : null}
        {t.link && <Link href={t.link.href} className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">{tr(t.link.label)}</Link>}
        {rel.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("People also ask")}</p>
            <div className="flex flex-wrap gap-2">{rel.map((r) => <button key={r.id} className="chip" onClick={() => openTopic(r, "browse")}>{title(r)}</button>)}</div>
          </div>
        )}
        <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Sparkles className="h-3.5 w-3.5" aria-hidden />{tr("Written in advance by our team, not by AI. Not a diagnosis.")}{t.source ? ` ${tr("Source")}: ${t.source}.` : ""}</p>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead title="Ask Bloom" sub="Ask an everyday question in English, Hindi or Hinglish. Every answer was written in advance by our team. Nothing is made up, and if we do not have a reviewed answer we say so." tag="Your questions" />
      <div className="mb-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: "ask", label: tr("Ask") }, { id: "browse", label: tr("Browse") }, ...(isMother ? [{ id: "mine", label: tr("My questions ({n})", { n: mine.length }) }] : [])]} /></div>

      {tab === "browse" && <Browse day={profile?.day ?? null} hi={hi} onOpen={(t) => openTopic(t, "browse")} family={auth.role === "family"} />}

      {tab === "mine" && (
        <div className="card space-y-3">
          {!mine.length && <p className="text-ink-muted">{tr("You have not sent any questions to your care team yet.")}</p>}
          {mine.map((q) => (
            <div key={q.id} className="space-y-2 border-b border-line pb-3 last:border-0">
              <p className="text-sm text-ink-muted">{fmtTime(q.createdAt)}</p>
              <p className="font-semibold">{q.question ?? tr("(could not be read)")}</p>
              {q.reply ? <p className="rounded-control bg-surface-2 p-3"><b>{tr("Your care team")}:</b> {q.reply}</p> : <p className="text-sm text-warn">{tr("Waiting for a reply (usually within 24 hours).")}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === "ask" && (
        <div className="space-y-4">
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
                {x.k === "answer" && <div className="space-y-3">{x.topics.length > 1 && <p className="text-sm font-semibold text-ink-muted">{tr("You asked about two things:")}</p>}{x.topics.map(answerCard)}</div>}
                {x.k === "pick" && (
                  <div className="space-y-2 rounded-2xl rounded-bl-md border border-plum-100 bg-surface-2 p-4">
                    <p className="font-bold text-plum-800">{tr("Did you mean…?")}</p>
                    {x.options.map((o) => <m.button key={o.id} whileTap={tap} className="block min-h-[48px] w-full rounded-control border border-line bg-surface px-4 py-3 text-left font-semibold text-plum-800 hover:bg-plum-100" onClick={() => openTopic(o, "picked")}>{title(o)}</m.button>)}
                    <button className="min-h-[44px] text-sm font-semibold text-primary underline underline-offset-4" onClick={() => add({ k: "none", text: x.text, near: x.options[0]?.id ?? null })}>{tr("None of these")}</button>
                  </div>
                )}
                {x.k === "who" && (
                  <div className="space-y-2 rounded-2xl rounded-bl-md border border-plum-100 bg-surface-2 p-4">
                    <p className="font-bold text-plum-800">{tr("Is this about you or your baby?")}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button className="btn-primary flex-1" onClick={() => run(x.text, (t) => t.who !== "baby")}>{tr("About me")}</button>
                      <button className="btn-ghost flex-1" onClick={() => run(x.text, (t) => t.who === "baby")}>{tr("About my baby")}</button>
                    </div>
                  </div>
                )}
                {x.k === "none" && <NoAnswer text={x.text} near={x.near} isMother={isMother} sending={sending} onSend={sendToTeam} onShare={shareGap} tr={tr} />}
                {x.k === "sent" && <p className="rounded-2xl rounded-bl-md border border-ok/40 bg-ok/10 p-4 font-semibold text-ink">{tr("Sent to your care team. You will usually get a reply within 24 hours, under My questions. If you feel unwell now, use the symptom checker or call 112.")}</p>}
                {x.k === "confirm" && (
                  <div className="rounded-2xl rounded-bl-md border border-warn/50 bg-warn/10 p-4">
                    <p className="flex items-center gap-2 font-bold text-ink"><ShieldQuestion className="h-5 w-5 text-warn" aria-hidden />{tr("Just checking")}</p>
                    <p className="mt-1 text-lg text-ink">{tr("It sounds like you may have said you do not have this. Do you have: {r}?", { r: tr(x.reason) })}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button className="btn-primary flex-1 !bg-danger" onClick={() => raise(x.reason, x.kind)}>{tr("Yes, I have this")}</button>
                      <button className="btn-ghost flex-1" onClick={() => run(x.text)}>{tr("No, I do not")}</button>
                    </div>
                  </div>
                )}
              </m.div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="card space-y-3">
            <label htmlFor="ask" className="block text-sm font-bold text-plum-800">{tr("Your question")}</label>
            <div className="flex items-start gap-2">
              <textarea id="ask" className="input min-h-[88px] flex-1 resize-y" value={text} maxLength={300} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder={tr("e.g. How long will the bleeding last?")} />
              <button onClick={mic} aria-pressed={listening} aria-label={listening ? tr("Stop listening") : tr("Speak your question")} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${listening ? "border-danger bg-danger/10 text-danger" : "border-line text-primary hover:bg-plum-100"}`}>
                {listening ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
              </button>
            </div>
            <m.button whileTap={tap} className="btn-primary w-full !py-3.5 text-base" onClick={() => submit()} disabled={!text.trim()}><Send className="h-4 w-4" aria-hidden />{tr("Ask")}</m.button>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Try an example")}</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{examples.map((e) => <button key={e} className="chip shrink-0 whitespace-nowrap" onClick={() => submit(e)}>{e}</button>)}</div>
            </div>
          </div>
          <p className="flex items-start gap-2 text-sm text-ink-muted"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{tr("If something feels wrong in your body right now, use the symptom checker or call 112. This page is for everyday questions.")}</p>
        </div>
      )}
      <Disclaimer />
    </div>
  );
}

/** No reviewed answer: never guess. Offer real people, and (only if she ticks it) share the question without her name. */
function NoAnswer({ text, near, isMother, sending, onSend, onShare, tr }: { text: string; near: string | null; isMother: boolean; sending: boolean; onSend: (t: string, n: string | null) => void; onShare: (t: string, n: string | null) => void; tr: (s: string, v?: Record<string, string | number>) => string }) {
  const [shared, setShared] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl rounded-bl-md border border-warn/50 bg-warn/10 p-4">
      <p className="font-bold text-ink">{tr("I do not have a reviewed answer for that, and I never guess.")}</p>
      {isMother && (
        <div className="space-y-1">
          <button className="btn-primary w-full" disabled={sending} onClick={() => onSend(text, near)}>{sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Inbox className="h-4 w-4" aria-hidden />}{tr("Send this question to my care team")}</button>
          <p className="text-xs text-ink-muted">{tr("Only if you tap this: your question is saved (encrypted) and your professional replies, usually within 24 hours.")}</p>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/check" className="btn-ghost flex-1">{tr("Symptom checker")}</Link>
        <Link href="/care" className="btn-ghost flex-1">{tr("Book a session")}</Link>
      </div>
      <a href="tel:14416" className="flex min-h-[44px] items-center justify-center gap-2 text-sm font-semibold text-plum-800 underline underline-offset-4"><Phone className="h-4 w-4" aria-hidden />{tr("Free help: Tele-MANAS")} 14416</a>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-2 text-sm text-ink-muted">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={shared} disabled={shared} onChange={() => { setShared(true); onShare(text, near); }} />
        <span>{shared ? tr("Thank you. Shared without your name.") : tr("Help us add an answer: share this question without your name (numbers and emails are removed).")}</span>
      </label>
    </div>
  );
}

/** Browse by stage and category, for mothers who do not know what to ask. */
function Browse({ day, hi, onOpen, family }: { day: number | null; hi: boolean; onOpen: (t: Topic) => void; family: boolean }) {
  const [stage, setStage] = useState<Stage | "all">(day === null ? "all" : stageOf(day));
  const [cat, setCat] = useState<Category | "all">(family ? "family" : "all");
  const list = TOPICS.filter((t) => META[t.id] && (cat === "all" || META[t.id].cat === cat) && (stage === "all" || META[t.id].stages.includes(stage)));
  const label = (x: { label: string; hi: string }) => (hi ? x.hi : x.label);
  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className={`chip ${stage === "all" ? "chip-on" : ""}`} onClick={() => setStage("all")}>{hi ? "किसी भी समय" : "Any time"}</button>
        {STAGES.map((st) => <button key={st.id} className={`chip ${stage === st.id ? "chip-on" : ""}`} onClick={() => setStage(st.id)}>{label(st)}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={`chip ${cat === "all" ? "chip-on" : ""}`} onClick={() => setCat("all")}>{hi ? "सभी विषय" : "All topics"}</button>
        {CATEGORIES.map((c) => <button key={c.id} className={`chip ${cat === c.id ? "chip-on" : ""}`} onClick={() => setCat(c.id)}>{label(c)}</button>)}
      </div>
      <ul className="divide-y divide-line">
        {list.map((t) => <li key={t.id}><button className="flex min-h-[48px] w-full items-center py-2 text-left font-semibold text-plum-800 hover:underline" onClick={() => onOpen(t)}>{hi ? t.hi_title : t.title}</button></li>)}
        {!list.length && <li className="py-2 text-ink-muted">{hi ? "इस चुनाव में अभी कोई विषय नहीं है।" : "No topics here yet."}</li>}
      </ul>
    </div>
  );
}
