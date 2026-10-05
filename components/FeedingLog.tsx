"use client";
import Link from "next/link";
import { Droplets, MessageCircleQuestion, Milk, TriangleAlert, Undo2, Baby } from "lucide-react";
import * as m from "motion/react-m";
import { useApp, daysSince, dayStr } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { useNow } from "@/lib/useNow";
import { BabyLog, KIND_LABEL, LogKind, babyNotes, countOn, usual } from "@/lib/babylog";
import { useTr } from "@/lib/i18n";
import { tap } from "@/lib/motion";

const ICON = { feed: Milk, wet: Droplets, stool: Baby } as const;
const KINDS: LogKind[] = ["feed", "wet", "stool"];

// One tap per feed or nappy. It compares today's counts with what is usual for the baby's age and says "ask a doctor" when they fall short.
// It never gives a verdict about the baby's health.
export function FeedingLog() {
  const { s } = useApp();
  const act = useActions();
  const tr = useTr();
  const now = useNow(30000);
  const age = daysSince(s.mother.birth);
  const logs: BabyLog[] = s.babyLogs;
  const today = dayStr(new Date(now));
  const u = usual(age);
  const last = logs[0];
  const notes = babyNotes(logs, age, now);
  const lastFeed = logs.find((l) => l.kind === "feed");
  const mins = lastFeed ? Math.max(0, Math.round((now - new Date(lastFeed.at).getTime()) / 60000)) : null;
  const ago = mins === null ? null : mins < 60 ? tr("{n} min ago", { n: mins }) : tr("{h} h {m} min ago", { h: Math.floor(mins / 60), m: mins % 60 });

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = dayStr(new Date(now - i * 86400000));
    return { d, feed: countOn(logs, "feed", d), wet: countOn(logs, "wet", d), stool: countOn(logs, "stool", d) };
  });

  return (
    <section className="space-y-4" aria-label={tr("Feeding and nappies")}>
      <div className="card space-y-3">
        <p className="text-sm text-ink-muted">{tr("Tap each time {baby} feeds or has a nappy. We compare with what is usual for {n} days old and tell you when to ask a doctor.", { baby: tr(s.mother.babyName || "your baby"), n: age })}</p>
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => {
            const Icon = ICON[k];
            const n = countOn(logs, k, today);
            const goal = k === "feed" ? u.feeds : k === "wet" ? u.wet : null;
            return (
              <m.button key={k} whileTap={tap} onClick={() => act.addBabyLog(k)} className="flex min-h-[112px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-plum-200 bg-plum-50 p-2 font-bold text-plum-800 transition hover:bg-plum-100" aria-label={`${tr(KIND_LABEL[k])}: ${n}`}>
                <Icon className="h-7 w-7 text-primary" aria-hidden />
                <span className="text-sm">{tr(k === "feed" ? "Fed" : k === "wet" ? "Wet nappy" : "Stool")}</span>
                <span className="font-serif text-3xl leading-none">{n}</span>
                {goal && <span className="text-xs font-semibold text-ink-muted">{tr("usual {n}+", { n: goal })}</span>}
              </m.button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-ink-muted">{ago ? `${tr("Last feed")}: ${ago}` : tr("No feeds logged yet.")}</span>
          {last && <button className="inline-flex min-h-[44px] items-center gap-1 font-bold text-primary" onClick={() => act.undoBabyLog(last.id)}><Undo2 className="h-4 w-4" aria-hidden />{tr("Undo last")}</button>}
        </div>
      </div>

      {notes.map((n) => (
        <p key={n.text} role="status" className={`flex items-start gap-2 rounded-card border p-4 text-sm ${n.tone === "warn" ? "border-warn/50 bg-warn/10" : "border-line bg-surface-2"}`}>
          <TriangleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${n.tone === "warn" ? "text-warn" : "text-ink-muted"}`} aria-hidden />
          <span>{tr(n.text)} {n.tone === "warn" && <Link href="/check" className="font-bold text-primary underline underline-offset-4">{tr("Use the symptom checker")}</Link>}</span>
        </p>
      ))}

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <caption className="sr-only">{tr("Last 7 days")}</caption>
          <thead><tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted"><th className="p-3">{tr("Day")}</th><th className="p-3">{tr("Feeds")}</th><th className="p-3">{tr("Wet")}</th><th className="p-3">{tr("Stools")}</th></tr></thead>
          <tbody>{week.map((r, i) => <tr key={r.d} className="border-b border-line last:border-0"><td className="p-3 font-semibold">{i === 0 ? tr("Today") : i === 1 ? tr("Yesterday") : r.d.slice(5)}</td><td className="p-3">{r.feed}</td><td className="p-3">{r.wet}</td><td className="p-3">{r.stool}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="card space-y-2 bg-plum-50">
        <h2 className="font-serif text-xl">{tr("Breastfeeding help")}</h2>
        <p className="text-sm text-ink">{tr("Good signs: about 6 or more wet nappies a day from around day 5, regular yellow stools, and a baby who is alert between feeds. Sore nipples, hard breasts and worry about milk are very common, and help is free from your ANM or ASHA.")}</p>
        <Link href="/ask" className="inline-flex min-h-11 items-center gap-2 font-bold text-primary underline underline-offset-4"><MessageCircleQuestion className="h-4 w-4" aria-hidden />{tr("Ask Bloom about feeding")}</Link>
      </div>
    </section>
  );
}
