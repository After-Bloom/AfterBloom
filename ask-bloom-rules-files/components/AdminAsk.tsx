"use client";
import { useEffect, useState } from "react";
import { TOPICS } from "@/lib/ask/knowledge";
import { useTr } from "@/lib/i18n";

// Admin page section: what mothers ask, how often Ask Bloom had no answer, and shared questions to turn into new answers.
// Everything here is anonymous: counts with no names, and shared questions with no user id and only the day.
type Data = { total: number; answered: number; noAnswer: number; toHuman: number; topTopics: { topic: string; n: number }[]; gaps: { id: number; question: string; lang: string; near_topic: string | null; day: string; status: string }[] };

export function AdminAsk() {
  const tr = useTr();
  const [d, setD] = useState<Data | null>(null);
  const load = async () => { const r = await fetch("/api/admin/ask", { cache: "no-store" }).catch(() => null); if (r?.ok) setD(await r.json()); };
  useEffect(() => { void load(); }, []);
  const mark = async (id: number, status: string) => { await fetch("/api/admin/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); void load(); };
  if (!d) return null;
  const title = (id: string | null) => TOPICS.find((t) => t.id === id)?.title ?? "—";
  const pct = (n: number) => (d.total ? `${Math.round((100 * n) / d.total)}%` : "0%");
  return (
    <section className="card space-y-4">
      <h2 className="font-serif text-2xl">{tr("Ask Bloom: last 30 days")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Questions", String(d.total)], ["Answered", pct(d.answered)], ["No answer", pct(d.noAnswer)], ["Sent to a professional", String(d.toHuman)]].map(([l, v]) => (
          <div key={l} className="rounded-control bg-surface-2 p-3"><div className="font-serif text-2xl text-plum-800">{v}</div><div className="text-xs font-semibold text-ink-muted">{tr(l)}</div></div>
        ))}
      </div>
      <div><h3 className="mb-1 font-bold">{tr("Most asked topics")}</h3>{d.topTopics.map((t) => <div key={t.topic} className="flex justify-between border-b border-line py-1 text-sm last:border-0"><span>{title(t.topic)}</span><b>{t.n}</b></div>)}</div>
      <div>
        <h3 className="mb-1 font-bold">{tr("Questions with no answer (shared without names)")}</h3>
        {!d.gaps.length && <p className="text-sm text-ink-muted">{tr("None yet.")}</p>}
        {d.gaps.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm last:border-0">
            <span className="min-w-0 flex-1">{g.question} <span className="text-ink-muted">· {g.day} · {tr("closest")}: {title(g.near_topic)}</span></span>
            <span className="flex gap-1">{["planned", "done", "ignored"].map((st) => <button key={st} className={`chip !min-h-[36px] !py-1 text-xs ${g.status === st ? "chip-on" : ""}`} onClick={() => mark(g.id, st)}>{tr(st)}</button>)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
