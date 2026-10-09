"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { collapseRepeats } from "@/lib/signals/correlate";
import { bpSeries, newSince, summarySentence, triggeredBy, whatChanged } from "@/lib/cases/summary";
import { actionSentence, caseEventSentence, caseTitle, concernLabel, routingReason, sourceLabel, statusLabel } from "@/lib/labels";
import { dayKey, formatDay, formatTime } from "@/lib/time";
import { AlertRow, useSignalTitle } from "@/components/pro/AlertRow";
import { CallButton } from "@/components/pro/parts";
import { Sparkline } from "@/components/pro/Sparkline";
import { DueCountdown, PriorityChip, priorityBar } from "@/components/pro/Priority";
import { ActionDialog, AuditTrail, EscalationCard, FamilyPanel, MoreActions, NextActionCard, WhyPriority, type CaseData, type DialogType } from "@/components/pro/CasePanels";
import type { CaseEvent, Signal, SignalSource } from "@/lib/types/cases";

const TONE = { ok: "bg-ok/15 text-ok", info: "bg-primary/10 text-primary", warn: "bg-warn/15 text-warn" } as const;

type Item =
  | { kind: "day"; key: string; label: string }
  | { kind: "row"; at: string; row: ReturnType<typeof collapseRepeats>[number] }
  | { kind: "action"; at: string; key: string; text: string; note: string | null }
  | { kind: "event"; at: string; key: string; text: string };

/** One case: what triggered it, what changed, why it has this priority, the one next action, and the timeline of everything that happened, newest at the bottom. */
export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const title = useSignalTitle();
  const [data, setData] = useState<CaseData | null>(null);
  const [problem, setProblem] = useState<"" | "missing" | "not-ready" | "error">("");
  const [since, setSince] = useState<string | null | undefined>(undefined);   // when I last looked, fixed for this visit so "new" stays highlighted
  const [source, setSource] = useState<"all" | SignalSource>("all");
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const viewed = useRef(false);
  const opened = useRef(false);
  const inflight = useRef(false);   // never start a new request while the last one is still running

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
      if (res.status === 503) return setProblem("not-ready");
      if (res.status === 404 || res.status === 403) return setProblem("missing");
      if (!res.ok) return setProblem("error");
      const j: CaseData = await res.json();
      setData(j); setProblem("");
      setSince((prev) => (prev === undefined ? j.lastViewedAt : prev));
      if (!viewed.current) { viewed.current = true; void fetch(`/api/cases/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view" }) }); }
      // arriving from "Call & log outcome" on the queue: open the form straight away
      if (!opened.current) {
        opened.current = true;
        if (new URLSearchParams(window.location.search).get("act") === "1" && j.case.status !== "resolved") setDialog(j.recommended.kind === "book_session" ? "book_session" : j.recommended.kind === "monitor" ? "monitor" : "call");
      }
    } catch { setProblem("error"); }
    finally { inflight.current = false; }
  }, [id]);
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 6000);
    return () => clearInterval(t);
  }, [load]);

  // every action goes through here: it resolves to an error word, or null when it worked, and then the page reloads
  const post = useCallback(async (body: Record<string, unknown>): Promise<string | null> => {
    try {
      const res = await fetch(`/api/cases/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      await load();
      return res.ok ? null : String(j.error ?? "failed");
    } catch { return "failed"; }
  }, [id, load]);

  const signals = data?.signals ?? [];
  const byId = useMemo(() => new Map(signals.map((x) => [x.id, x])), [signals]);
  const triggers = useMemo(() => triggeredBy(signals), [signals]);
  const chips = useMemo(() => whatChanged(signals, data?.checkins ?? [], lang), [signals, data?.checkins, lang]);
  const fresh = useMemo(() => newSince(signals, since ?? null), [signals, since]);
  const bp = useMemo(() => bpSeries(data?.checkins ?? []), [data?.checkins]);
  const evBySignal = useMemo(() => {
    const m = new Map<string, CaseEvent[]>();
    for (const e of data?.events ?? []) { const sid = e.detail.signalId as string | undefined; if (sid && ["opened", "reopened", "severity_raised", "link_confirmed"].includes(e.type)) m.set(sid, [...(m.get(sid) ?? []), e]); }
    return m;
  }, [data?.events]);
  const sources = useMemo(() => [...new Set(signals.map((x) => x.source))], [signals]);

  const decide = async (x: Signal, action: "confirm" | "unlink") => {
    setBusy(x.id);
    try { await fetch("/api/signals/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId: x.id, action }) }); await load(); }
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
  const yesterdayKey = dayKey(new Date(Date.now() - 86400000).toISOString());
  const dayLabel = (iso: string) => (dayKey(iso) === todayKey ? tr("Today") : dayKey(iso) === yesterdayKey ? tr("Yesterday") : formatDay(iso, lang));

  // the timeline: alerts, what people did, and what the system did, in time order with a heading each time the day changes
  const rows = collapseRepeats(signals.filter((x) => source === "all" || x.source === source));
  const merged: Exclude<Item, { kind: "day" }>[] = [
    ...rows.map((row) => ({ kind: "row" as const, at: row.signal.observedAt, row })),
    ...(source === "all" ? data.actions.filter((a) => a.type !== "acknowledge" || true).map((a) => ({ kind: "action" as const, at: a.at, key: a.id, text: actionSentence({ type: a.type, outcome: a.outcome, by: a.by, detail: a.detail }, lang), note: a.note })) : []),
    ...(source === "all" ? data.events.map((e) => ({ e, text: caseEventSentence(e, lang) })).filter((x) => x.text).map((x) => ({ kind: "event" as const, at: x.e.at, key: `e${x.e.id}`, text: x.text! })) : []),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const timeline: Item[] = [];
  let last = "";
  for (const it of merged) {
    const d = dayKey(it.at);
    if (d !== last) { timeline.push({ kind: "day", key: `${d}-${it.at}`, label: dayLabel(it.at) }); last = d; }
    timeline.push(it);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {back}

      <header className="card relative overflow-hidden !p-0">
        <span className={`absolute inset-y-0 left-0 w-1.5 ${priorityBar(data.priority.value)}`} aria-hidden />
        <div className="flex flex-wrap items-start gap-4 p-5 pl-7">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">{caseTitle(c.concern, lang)}</h1>
            <p className="text-sm text-ink-muted">{tr(data.patient.name)} · {tr("Day {n} postpartum", { n: data.patient.day })}{data.patient.delivery ? ` · ${tr(data.patient.delivery)}` : ""} · {tr("case opened")} {formatTime(c.openedAt, lang)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <PriorityChip priority={data.priority.value} />
              <DueCountdown dueBy={c.dueBy} priority={data.priority.value} />
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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
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
                : item.kind === "row"
                  ? <AlertRow key={item.row.signal.id} sig={item.row.signal} repeats={item.row.repeats} parentTitle={item.row.signal.relatedTo && byId.get(item.row.signal.relatedTo) ? title(byId.get(item.row.signal.relatedTo)!) : undefined}
                      events={evBySignal.get(item.row.signal.id)} isNew={fresh.has(item.row.signal.id)} indent={item.row.signal.relation === "FOLLOW_UP"} busy={busy === item.row.signal.id} onDecide={decide} />
                  : item.kind === "action"
                    ? <li key={item.key} className="flex items-start gap-3 rounded-control border border-ok/40 bg-ok/10 p-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden /><div className="min-w-0"><p className="text-sm font-semibold">{item.text}</p><p className="text-xs text-ink-muted">{formatTime(item.at, lang)}{item.note ? ` · ${tr("Note")}: ${item.note}` : ""}</p></div></li>
                    : <li key={item.key} className="px-3 py-1 text-xs font-semibold text-ink-muted">{formatTime(item.at, lang)} · {item.text}</li>)}
            </ul>
          </section>
          <AuditTrail d={data} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <NextActionCard d={data} onOpen={setDialog} post={post} />
          <WhyPriority d={data} />
          <EscalationCard d={data} />
          <div id="family"><FamilyPanel d={data} post={post} /></div>
          <MoreActions d={data} onOpen={setDialog} onFamily={() => document.getElementById("family")?.scrollIntoView({ behavior: "smooth", block: "center" })} />
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
        </aside>
      </div>

      {dialog && <ActionDialog type={dialog} phone={data.patient.phone} onClose={() => setDialog(null)} post={post} />}
    </div>
  );
}
