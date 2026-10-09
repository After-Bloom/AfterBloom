"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { collapseRepeats } from "@/lib/signals/correlate";
import { bpSeries, newSince, summarySentence, triggeredBy, whatChanged } from "@/lib/cases/summary";
import { caseTitle, concernLabel, routingReason, sourceLabel, statusLabel } from "@/lib/labels";
import { dayKey, formatDay, formatTime } from "@/lib/time";
import { AlertRow, SEV, SeverityBadge, useSignalTitle } from "@/components/pro/AlertRow";
import { CallButton } from "@/components/pro/parts";
import { Sparkline } from "@/components/pro/Sparkline";
import type { Case, CaseEvent, Signal, SignalSource } from "@/lib/types/cases";

type Data = {
  me: string; case: Case; ownerName: string;
  patient: { id: string; name: string; shares: boolean; phone: string | null; day: number; delivery: string };
  signals: Signal[]; checkins: { date: string; sleepHours: number; mood: number; bp?: { sys: number; dia: number } }[]; events: CaseEvent[]; lastViewedAt: string | null;
};
const TONE = { ok: "bg-ok/15 text-ok", info: "bg-primary/10 text-primary", warn: "bg-warn/15 text-warn" } as const;

/** One case: what triggered it, what changed, when, and the timeline of every alert in it, newest at the bottom. */
export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const title = useSignalTitle();
  const [data, setData] = useState<Data | null>(null);
  const [problem, setProblem] = useState<"" | "missing" | "not-ready" | "error">("");
  const [since, setSince] = useState<string | null | undefined>(undefined);   // when I last looked, fixed for this visit so "new" stays highlighted
  const [source, setSource] = useState<"all" | SignalSource>("all");
  const [busy, setBusy] = useState("");
  const viewed = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
      if (res.status === 503) return setProblem("not-ready");
      if (res.status === 404 || res.status === 403) return setProblem("missing");
      if (!res.ok) return setProblem("error");
      const j: Data = await res.json();
      setData(j); setProblem("");
      setSince((prev) => (prev === undefined ? j.lastViewedAt : prev));
      if (!viewed.current) { viewed.current = true; void fetch(`/api/cases/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }) }); }
    } catch { setProblem("error"); }
  }, [id]);
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const signals = data?.signals ?? [];
  const byId = useMemo(() => new Map(signals.map((x) => [x.id, x])), [signals]);
  const triggers = useMemo(() => triggeredBy(signals), [signals]);
  const chips = useMemo(() => whatChanged(signals, data?.checkins ?? [], lang), [signals, data?.checkins, lang]);
  const fresh = useMemo(() => newSince(signals, since ?? null), [signals, since]);
  const bp = useMemo(() => bpSeries(data?.checkins ?? []), [data?.checkins]);
  const evBySignal = useMemo(() => {
    const m = new Map<string, CaseEvent[]>();
    for (const e of data?.events ?? []) { const sid = e.detail.signalId as string | undefined; if (sid && e.type !== "link_unlinked") m.set(sid, [...(m.get(sid) ?? []), e]); }
    return m;
  }, [data?.events]);
  const rows = useMemo(() => collapseRepeats(signals.filter((x) => source === "all" || x.source === source)), [signals, source]);
  const sources = useMemo(() => [...new Set(signals.map((x) => x.source))], [signals]);

  const decide = async (x: Signal, action: "confirm" | "unlink") => {
    setBusy(x.id);
    try { await fetch("/api/signals/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId: x.id, action }) }); await load(); }
    finally { setBusy(""); }
  };
  const resolve = async () => {
    if (!confirm(tr("Mark this case as resolved? If a new alert about the same concern arrives within 7 days, the case reopens by itself."))) return;
    setBusy("resolve");
    try { await fetch(`/api/cases/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resolve" }) }); await load(); }
    finally { setBusy(""); }
  };

  const back = <Link href="/pro/alerts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" aria-hidden />{tr("Back to alerts")}</Link>;
  if (problem === "not-ready") return <div className="mx-auto max-w-3xl space-y-4">{back}<div role="status" className="card text-ink-muted">{tr("Cases need the latest database update (migration 008). Ask the administrator to run it, then refresh.")}</div></div>;
  if (problem === "missing") return <div className="mx-auto max-w-3xl space-y-4">{back}<div className="card text-ink-muted">{tr("This case could not be found, or you no longer have access to it.")}</div></div>;
  if (!data) return <div className="mx-auto max-w-5xl space-y-4" aria-busy="true"><div className="h-12 w-1/2 animate-pulse rounded bg-surface-2" />{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-surface-2" />)}</div>;

  const c = data.case;
  const r = c.ownerReason ? routingReason(c.ownerReason, lang) : null;
  const sentence = summarySentence(c, signals, lang, title);
  const resolved = c.status === "resolved";
  const toConfirm = signals.filter((x) => x.linkStatus === "suggested").length;
  const todayKey = dayKey(new Date().toISOString());
  const dayLabel = (iso: string) => (dayKey(iso) === todayKey ? tr("Today") : dayKey(iso) === dayKey(new Date(Date.now() - 86400000).toISOString()) ? tr("Yesterday") : formatDay(iso, lang));

  // the timeline, a heading each time the day changes
  const timeline: ({ kind: "day"; key: string; label: string } | { kind: "row"; row: (typeof rows)[number] })[] = [];
  let last = "";
  for (const row of rows) {
    const d = dayKey(row.signal.observedAt);
    if (d !== last) { timeline.push({ kind: "day", key: `${d}-${row.signal.id}`, label: dayLabel(row.signal.observedAt) }); last = d; }
    timeline.push({ kind: "row", row });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {back}

      <header className={`card relative overflow-hidden !p-0 ${SEV[c.severityPeak].border}`}>
        <span className={`absolute inset-y-0 left-0 w-1.5 ${c.severityPeak === "red" ? "bg-danger" : c.severityPeak === "amber" ? "bg-warn" : "bg-line"}`} aria-hidden />
        <div className="flex flex-wrap items-start gap-4 p-5 pl-7">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">{caseTitle(c.concern, lang)}</h1>
            <p className="text-sm text-ink-muted">{tr(data.patient.name)} · {tr("Day {n} postpartum", { n: data.patient.day })}{data.patient.delivery ? ` · ${tr(data.patient.delivery)}` : ""} · {tr("case opened")} {formatTime(c.openedAt, lang)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={c.severityPeak} />
              <span className="rounded-full bg-plum-100 px-2.5 py-0.5 text-xs font-bold text-plum-800">{concernLabel(c.concern, lang)}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-muted">{statusLabel(c.status, lang)}</span>
              {c.reopenedCount > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-bold text-warn"><RotateCcw className="h-3 w-3" aria-hidden />{tr("Reopened")}</span>}
              {r && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[r.tone]}`}>{r.chip}: {c.ownerProId === data.me ? tr("you") : data.ownerName || c.ownerReason?.proName || tr("not assigned")}</span>}
            </div>
            {r && <p className="text-xs text-ink-muted">{r.reason}</p>}
          </div>
          <div className="flex flex-col items-end gap-3">
            <CallButton phone={data.patient.phone} />
            {data.patient.shares && bp.length >= 2 && (
              <figure className="text-right"><Sparkline points={bp} /><figcaption className="text-xs text-ink-muted">{tr("Blood pressure, last 14 days")}</figcaption></figure>
            )}
          </div>
        </div>
      </header>

      {resolved && <p role="status" className="flex items-center gap-2 rounded-control bg-ok/10 p-3 text-sm font-semibold text-ok"><CheckCircle2 className="h-5 w-5" aria-hidden />{tr("Resolved")} {c.resolvedAt ? formatTime(c.resolvedAt, lang) : ""}. {tr("If a new alert about this concern arrives within 7 days, the case reopens by itself.")}</p>}
      {!data.patient.shares && <p className="rounded-control bg-warn/10 p-3 text-sm font-semibold text-warn">{tr("She is not sharing her check-ins and screening results right now. You see red and safety alerts only, without the details.")}</p>}

      {sentence && <blockquote className="card !p-4 font-serif text-lg italic leading-snug text-plum-900">“{sentence}”</blockquote>}

      <section aria-labelledby="changed-h" className="space-y-2">
        <h2 id="changed-h" className="text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("What changed")}</h2>
        <ul className="flex flex-wrap gap-2">
          {chips.map((x) => <li key={x.text} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold">{x.text}</li>)}
          {chips.length === 0 && <li className="text-sm text-ink-muted">{tr("Nothing has changed yet. This is the first alert.")}</li>}
          {fresh.size > 0 && <li className="inline-flex items-center gap-1.5 rounded-full bg-primary-fill px-3 py-1.5 text-sm font-bold text-primary-on"><Sparkles className="h-4 w-4" aria-hidden />{tr("{n} new since you last looked", { n: fresh.size })}</li>}
        </ul>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="timeline-h" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="timeline-h" className="font-serif text-2xl">{tr("Timeline")}</h2>
            {sources.length > 1 && (
              <label className="flex items-center gap-2 text-sm font-semibold text-plum-800">{tr("Source")}
                <select className="input !w-auto !py-1.5" value={source} onChange={(e) => setSource(e.target.value as "all" | SignalSource)}>
                  <option value="all">{tr("All sources")}</option>
                  {sources.map((x) => <option key={x} value={x}>{sourceLabel(x, lang)}</option>)}
                </select>
              </label>
            )}
          </div>
          {toConfirm > 0 && <p className="rounded-control bg-primary/10 p-2.5 text-sm font-semibold text-primary">{tr("{n} alert(s) from another concern might belong here. Confirm or separate them below.", { n: toConfirm })}</p>}
          <ul className="space-y-2">
            {timeline.map((item) => item.kind === "day"
              ? <li key={item.key} className="pt-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{item.label}</li>
              : <AlertRow key={item.row.signal.id} sig={item.row.signal} repeats={item.row.repeats} parentTitle={item.row.signal.relatedTo && byId.get(item.row.signal.relatedTo) ? title(byId.get(item.row.signal.relatedTo)!) : undefined}
                  events={evBySignal.get(item.row.signal.id)} isNew={fresh.has(item.row.signal.id)} indent={item.row.signal.relation === "FOLLOW_UP"} busy={busy === item.row.signal.id} onDecide={decide} />)}
          </ul>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="card space-y-3" aria-labelledby="trig-h">
            <h2 id="trig-h" className="text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("Triggered by")}</h2>
            <ol className="space-y-2">
              {triggers.map((x, i) => (
                <li key={x.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${x.severity === "red" ? "bg-danger" : "bg-warn"}`} aria-hidden />
                  <span><b>{title(x)}</b><br /><span className="text-xs text-ink-muted">{i === 0 ? tr("opened the case") : tr("raised it to {s}", { s: x.severity === "red" ? tr("red") : tr("amber") })} · {formatTime(x.observedAt, lang)}</span></span>
                </li>
              ))}
            </ol>
          </section>

          {!resolved && (
            <section className="card space-y-2" aria-labelledby="close-h">
              <h2 id="close-h" className="text-xs font-bold uppercase tracking-wide text-ink-muted">{tr("When it is sorted")}</h2>
              <p className="text-sm text-ink-muted">{tr("A case never closes by itself, not even a mild one. Only you can resolve it.")}</p>
              <button className="btn-soft w-full" disabled={busy === "resolve"} onClick={resolve}>{busy === "resolve" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}{tr("Mark as resolved")}</button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
