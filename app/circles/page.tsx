"use client";
import { useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { CalendarClock, EyeOff, HeartHandshake, Info, Loader2, Send, ShieldCheck, Users, Video } from "lucide-react";
import { useApp } from "@/lib/store";
import { useCircle } from "@/lib/data/circle";
import { ADVICE_NOTE, TOPICS, hasSelfHarmLanguage, looksLikeMedicalAdvice } from "@/lib/safety";
import { canJoin, roomUrl } from "@/lib/slots";
import { PageHead, Disclaimer, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { rise, spring, tap } from "@/lib/motion";

export default function Circles() {
  const { s, openCrisis } = useApp();
  const tr = useTr();
  const { info, posts, mine, events, loading, error, add } = useCircle(s.circleId);
  const [filter, setFilter] = useState<string>("All");
  const [topic, setTopic] = useState<string>("General");
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [thanks, setThanks] = useState(false);
  const feedEnd = useRef<HTMLDivElement>(null);

  const advice = useMemo(() => looksLikeMedicalAdvice(text), [text]);
  const shown = posts.filter((p) => filter === "All" || p.topic === filter);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setErr("");
    // On the phone first: a crisis message shows help at once, before anything is sent.
    if (hasSelfHarmLanguage(t)) openCrisis({ kind: "selfharm", reason: "" });
    try {
      const res = await fetch("/api/circles/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t, topic, anon }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "failed");
      add(j.post); setText(""); setThanks(true); setTimeout(() => setThanks(false), 2500);
      setTimeout(() => feedEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch (e: any) { setErr(e?.message && e.message !== "failed" ? e.message : tr("Could not post. Please try again.")); }
    setBusy(false);
  };

  if (!s.circleId && !loading) {
    return <div className="mx-auto max-w-2xl space-y-4"><PageHead title="Bloom Circles" sub="A small, safe group of mothers at your stage." /><div className="card">{tr("You are not in a circle yet. Circles are made when you sign up, from your baby's birth month, language and city.")}</div></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHead title="Bloom Circles" sub="A small, safe group of mothers who gave birth the same month as you." tag="Community" />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card flex flex-wrap items-center gap-4" aria-label={tr("Your circle")}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-plum-100 text-primary"><Users className="h-6 w-6" aria-hidden /></span>
            <div className="min-w-0 flex-1"><h2 className="font-serif text-2xl leading-tight">{info?.name ?? <span className="inline-block h-6 w-48 animate-pulse rounded bg-surface-2 align-middle" />}</h2><p className="text-sm text-ink-muted">{info ? tr("{n} mothers", { n: info.members }) : ""}{info?.mentor ? ` · ${tr("Guided by")} ${info.mentor}` : ""}</p></div>
            <HeartHandshake className="hidden h-8 w-8 text-primary sm:block" aria-hidden />
          </section>

          <section className="card space-y-3" aria-label={tr("Write to your circle")}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("Topic")}>
              {TOPICS.map((t) => <button key={t} role="radio" aria-checked={topic === t} onClick={() => setTopic(t)} className={`chip ${topic === t ? "chip-on" : ""}`}>{tr(t)}</button>)}
            </div>
            <label htmlFor="circle-text" className="sr-only">{tr("Your message")}</label>
            <textarea id="circle-text" className="input min-h-[96px] resize-y" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Share how you are feeling. Others are here.")} />
            <AnimatePresence>
              {advice && (
                <m.p variants={rise} initial="hidden" animate="show" exit="exit" className="flex items-start gap-2 rounded-control bg-warn/10 p-3 text-sm text-ink"><Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />{tr("This looks like medical advice. We will add a note: ")}<b>{tr(ADVICE_NOTE)}</b></m.p>
              )}
            </AnimatePresence>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" role="switch" aria-checked={anon} onClick={() => setAnon(!anon)} className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-plum-800">
                <span className={`relative h-6 w-11 rounded-full transition ${anon ? "bg-primary-fill" : "bg-line"}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${anon ? "translate-x-5" : ""}`} /></span>
                <EyeOff className="h-4 w-4" aria-hidden />{tr("Post anonymously")}
              </button>
              <m.button whileTap={tap} className="btn-primary" onClick={send} disabled={!text.trim() || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}{tr("Post")}</m.button>
            </div>
            {err && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}
            {thanks && <p role="status" className="text-sm font-semibold text-ok">{tr("Posted. Thank you for sharing.")}</p>}
          </section>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={tr("Filter by topic")}>
            {["All", ...TOPICS.filter((t) => t !== "General")].map((t) => <button key={t} aria-pressed={filter === t} onClick={() => setFilter(t)} className={`chip shrink-0 ${filter === t ? "chip-on" : ""}`}>{tr(t)}</button>)}
          </div>

          <section aria-label={tr("Conversation")} aria-live="polite">
            {loading && <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-surface-2" />)}</div>}
            {error && <p role="alert" className="card text-warn">{tr("Could not load the circle. Please try again.")}</p>}
            {!loading && !error && shown.length === 0 && <div className="card text-ink-muted">{tr("No posts here yet. Be the first to say hello.")}</div>}
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {shown.map((p) => (
                  <m.li key={p.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.gentle} className={`card !p-4 ${mine.has(p.id) ? "!border-primary/40" : ""}`}>
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <b className="text-plum-800">{p.anon ? tr("Anonymous mother") : tr(p.alias)}</b>
                      {mine.has(p.id) && <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11px] font-bold text-primary">{tr("You")}</span>}
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{tr(p.topic)}</span>
                      <span className="text-xs text-ink-muted">{fmtTime(p.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-base">{p.text}</p>
                    {p.note && <p className="mt-2 flex items-start gap-1.5 rounded-control bg-warn/10 p-2 text-xs font-semibold text-ink"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />{tr(p.note)}</p>}
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
            <div ref={feedEnd} />
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="card space-y-2" aria-labelledby="safe-h">
            <h2 id="safe-h" className="flex items-center gap-2 font-serif text-xl"><ShieldCheck className="h-5 w-5 text-ok" aria-hidden />{tr("How we keep it safe")}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
              <li>{tr("No medical advice from members. Use the symptom checker or ask your doctor.")}</li>
              <li>{tr("Messages about hurting yourself are seen by a person, and you are shown help straight away. The software never replies on its own.")}</li>
              <li>{tr("No judging, shaming or comparing. Every baby and every mother is different.")}</li>
              <li>{tr("Post anonymously any time. Only moderators can see who wrote a message.")}</li>
            </ul>
          </section>
          <section className="card space-y-2" aria-labelledby="exp-h">
            <h2 id="exp-h" className="flex items-center gap-2 font-serif text-xl"><CalendarClock className="h-5 w-5 text-primary" aria-hidden />{tr("Expert sessions")}</h2>
            {events.length === 0 && <p className="text-sm text-ink-muted">{tr("A monthly live question-and-answer with a psychologist, lactation consultant or gynaecologist. The next one will be listed here.")}</p>}
            {events.map((e) => (
              <div key={e.id} className="rounded-control bg-surface-2 p-3 text-sm">
                <div className="font-bold">{e.title}</div>
                <div className="text-ink-muted">{e.host}{e.hostTitle ? `, ${tr(e.hostTitle)}` : ""}</div>
                <div className="text-ink-muted">{fmtTime(e.starts_at)}</div>
                <a href={canJoin(e.starts_at) ? roomUrl(e.room) : undefined} target="_blank" rel="noreferrer" aria-disabled={!canJoin(e.starts_at)} className={`btn-soft mt-2 !py-2 ${canJoin(e.starts_at) ? "" : "pointer-events-none opacity-50"}`}><Video className="h-4 w-4" aria-hidden />{tr("Join")}</a>
              </div>
            ))}
          </section>
        </aside>
      </div>
      <Disclaimer />
    </div>
  );
}
