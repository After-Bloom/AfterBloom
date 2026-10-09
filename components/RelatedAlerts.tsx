"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { BellOff, ChevronDown, CircleCheck, Info, Link2, Link2Off, OctagonAlert, TriangleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { Segmented } from "@/components/ui";
import { bySymptomId } from "@/lib/symptoms";
import { collapseRepeats, groupSignals } from "@/lib/signals/correlate";
import { concernLabel, notifyLabel, relationLabel, routingReason, severityLabel, signalTitle, sourceLabel, whyLinked } from "@/lib/labels";
import { dayKey, formatClock, formatDay, formatTime } from "@/lib/time";
import { rise, spring, stagger } from "@/lib/motion";
import type { PatientSignals, Severity, Signal } from "@/lib/types/cases";

// Challenge 1 on the professional's screen: the same alerts shown two ways.
//   Individual alerts: every alert on its own, newest first. This is the alert overload.
//   Grouped by concern: the same alerts, folded by how they relate, each with a plain "why linked" line. Nothing is deleted.

const SEV: Record<Severity, { icon: typeof OctagonAlert; text: string; bg: string; border: string }> = {
  red: { icon: OctagonAlert, text: "text-danger", bg: "bg-danger/10", border: "border-danger/50" },
  amber: { icon: TriangleAlert, text: "text-warn", bg: "bg-warn/10", border: "border-warn/50" },
  info: { icon: Info, text: "text-ink-muted", bg: "bg-surface-2", border: "border-line" },
};
const TONE = { ok: "bg-ok/15 text-ok", info: "bg-primary/10 text-primary", warn: "bg-warn/15 text-warn" } as const;

/** Severity is always an icon, a word and a colour. */
function SeverityBadge({ severity }: { severity: Severity }) {
  const { s } = useApp();
  const x = SEV[severity];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${x.bg} ${x.text} ${x.border}`}><x.icon className="h-3.5 w-3.5" aria-hidden />{severityLabel(severity, s.lang)}</span>;
}

type Busy = { id: string; action: "confirm" | "unlink" } | null;

export default function RelatedAlerts({ meId, patientId }: { meId: string; patientId?: string }) {
  const { s } = useApp();
  const tr = useTr();
  const lang = s.lang;
  const [data, setData] = useState<PatientSignals[] | null>(null);
  const [me, setMe] = useState(meId);
  const [problem, setProblem] = useState<"" | "not-ready" | "error">("");
  const [view, setView] = useState<"individual" | "grouped">("individual");
  const [who, setWho] = useState<"care" | "mine">("care");
  const [open, setOpen] = useState<Set<string>>(new Set());   // repeat rows that are expanded
  const [busy, setBusy] = useState<Busy>(null);

  // poll every 5 seconds: the table has no live feed because it is only readable through the server's consent check
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/signals", { cache: "no-store" });
      if (res.status === 503) return setProblem("not-ready");
      if (!res.ok) return setProblem("error");
      const j = await res.json();
      setMe(j.me ?? meId); setData(j.patients ?? []); setProblem("");
    } catch { setProblem("error"); }
  }, [meId]);
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const decide = async (sig: Signal, action: "confirm" | "unlink") => {
    setBusy({ id: sig.id, action });
    try { await fetch("/api/signals/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId: sig.id, action }) }); await load(); }
    finally { setBusy(null); }
  };

  const title = (sig: Signal) => { const sym = bySymptomId(sig.code); return signalTitle(sig, lang, sym ? { label: sym.label, hi: sym.hi } : undefined); };
  const titleOf = useMemo(() => {
    const byId = new Map<string, Signal>();
    (data ?? []).forEach((p) => p.signals.forEach((x) => byId.set(x.id, x)));
    return (id: string | null) => (id && byId.get(id) ? title(byId.get(id)!) : undefined);
  }, [data, lang]); // eslint-disable-line

  // "Mine" keeps only the concerns I own for that patient
  const shown = useMemo(() => (data ?? []).filter((p) => !patientId || p.id === patientId).map((p) => ({
    ...p, signals: who === "mine" ? p.signals.filter((x) => p.owners[x.concern]?.proId === me) : p.signals,
  })).filter((p) => p.signals.length > 0).sort((a, b) => Math.max(...b.signals.map((x) => +(x.severity === "red"))) - Math.max(...a.signals.map((x) => +(x.severity === "red"))) || a.name.localeCompare(b.name)), [data, who, me, patientId]);

  const total = shown.reduce((a, p) => a + p.signals.length, 0);
  const groupCount = shown.reduce((a, p) => a + groupSignals(p.signals).length, 0);
  const held = shown.reduce((a, p) => a + p.signals.filter((x) => !x.notified).length, 0);
  const toConfirm = shown.reduce((a, p) => a + p.signals.filter((x) => x.linkStatus === "suggested").length, 0);

  if (problem === "not-ready") return <div role="status" className="card text-ink-muted">{tr("Related alerts need the latest database update (migration 007). Ask the administrator to run it, then refresh.")}</div>;
  if (!data && problem === "error") return <div role="alert" className="card text-warn">{tr("Could not load the related alerts. Please check your connection.")}</div>;
  if (!data) return <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-surface-2" />)}</div>;

  // one alert, as a row. `repeats` are folded into it with a count and expand on tap.
  const renderRow = (sig: Signal, repeats: Signal[] = []) => {
    const x = SEV[sig.severity];
    const isOpen = open.has(sig.id);
    const suggested = sig.linkStatus === "suggested";
    const linked = sig.relation !== "NEW" && sig.linkStatus !== "unlinked" && !suggested;
    return (
      <m.li key={sig.id} layout="position" transition={spring.snappy} className={`rounded-control border p-3 ${suggested ? "border-primary/50 bg-primary/5" : `${x.border} ${x.bg}`}`}>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <SeverityBadge severity={sig.severity} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{title(sig)}{sig.subject === "baby" && <span className="ml-2 rounded-full bg-plum-100 px-2 py-0.5 text-xs font-bold text-plum-800">{tr("Baby")}</span>}</p>
            <p className="text-xs text-ink-muted">{sourceLabel(sig.source, lang)} · {formatTime(sig.observedAt, lang)}</p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sig.relation === "NEW" || sig.linkStatus === "unlinked" ? "bg-surface-2 text-ink-muted" : suggested ? "bg-primary/15 text-primary" : "bg-plum-100 text-plum-800"}`}>{relationLabel(sig, lang)}</span>
        </div>
        {/* the rule that linked this alert, in plain words */}
        <p className="mt-1.5 text-xs text-ink-muted"><b>{tr("Why linked")}:</b> {whyLinked(sig, lang, titleOf(sig.relatedTo))}</p>
        <p className={`mt-0.5 flex items-center gap-1 text-xs ${sig.notified ? "text-ink-muted" : "font-semibold text-ok"}`}>{!sig.notified && <BellOff className="h-3.5 w-3.5" aria-hidden />}{notifyLabel(sig, lang)}</p>

        {(suggested || linked) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggested && <button className="btn-primary !min-h-0 !py-1.5 text-sm" disabled={busy?.id === sig.id} onClick={() => decide(sig, "confirm")}><Link2 className="h-4 w-4" aria-hidden />{tr("Confirm link")}</button>}
            <button className="btn-ghost !min-h-0 !py-1.5 text-sm" disabled={busy?.id === sig.id} onClick={() => decide(sig, "unlink")}><Link2Off className="h-4 w-4" aria-hidden />{suggested ? tr("Unlink") : tr("Not related")}</button>
          </div>
        )}

        {repeats.length > 0 && (
          <div className="mt-2">
            <button aria-expanded={isOpen} className="inline-flex items-center gap-1 text-xs font-bold text-primary" onClick={() => setOpen((o) => { const n = new Set(o); n.has(sig.id) ? n.delete(sig.id) : n.add(sig.id); return n; })}>
              <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />{tr("Repeat x{n}", { n: repeats.length + 1 })}{" · "}{isOpen ? tr("hide repeats") : tr("show repeats")}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.ul variants={rise} initial="hidden" animate="show" exit="exit" className="mt-1 space-y-1 border-l-2 border-line pl-3">
                  {repeats.map((r) => <li key={r.id} className="text-xs text-ink-muted">{formatTime(r.observedAt, lang)} · {sourceLabel(r.source, lang)}{r.value && (r.value as any).sys ? ` · ${(r.value as any).sys}/${(r.value as any).dia}` : ""}</li>)}
                </m.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </m.li>
    );
  };

  return (
    <div className="space-y-4">
      {/* live counts: nothing here is typed in, they are worked out from the alerts below */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[total, "Alerts received"], [groupCount, "Groups by concern"], [held, "Notifications held back"], [toConfirm, "To confirm"]].map(([n, l]) => (
          <div key={l as string} className="card !p-4"><div className="font-serif text-3xl leading-none text-plum-800">{n as number}</div><div className="mt-1 text-xs font-semibold text-ink-muted">{tr(l as string)}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-80"><Segmented<"individual" | "grouped"> label="View" value={view} onChange={setView} options={[{ id: "individual", label: "Individual alerts" }, { id: "grouped", label: "Grouped by concern" }]} /></div>
        <div className="w-full sm:w-64"><Segmented<"care" | "mine"> label="Whose" value={who} onChange={setWho} options={[{ id: "care", label: "Care team" }, { id: "mine", label: "Mine" }]} /></div>
        <p className="text-sm font-semibold text-plum-800" aria-live="polite">{view === "grouped" ? tr("{a} alerts into {b} groups", { a: total, b: groupCount }) : tr("{a} separate alerts", { a: total })}</p>
      </div>
      <p className="text-xs text-ink-muted">{tr("Same data, nothing deleted. Grouping only changes how the alerts are laid out, and a rise in severity, a new concern or any safety alert always reaches the care team.")}</p>

      {shown.length === 0 && <div className="card text-ink-muted">{who === "mine" ? tr("Nothing is assigned to you right now.") : tr("No related alerts yet. They appear here as soon as a mother checks in or uses the symptom checker.")}</div>}

      <LayoutGroup>
        <m.div variants={stagger()} initial="hidden" animate="show" className="space-y-5">
          {shown.map((p) => {
            const groups = groupSignals(p.signals);
            return (
              <m.section variants={rise} key={p.id} aria-label={p.name} className="card space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl">{tr(p.name)} <span className="text-sm font-normal text-ink-muted">· {tr("Day {n} postpartum", { n: p.day })}</span></h3>
                  <span className="text-xs font-semibold text-ink-muted">{view === "grouped" ? tr("{a} alerts into {b} groups", { a: p.signals.length, b: groups.length }) : tr("{a} separate alerts", { a: p.signals.length })}</span>
                </div>
                {!p.shares && <p className="rounded-control bg-warn/10 p-2 text-xs font-semibold text-warn">{tr("She is not sharing her check-ins and screening results right now. You see red and safety alerts only, without the details.")}</p>}

                {view === "individual" ? (
                  <ul className="space-y-2">{[...p.signals].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).map((x) => renderRow(x))}</ul>
                ) : (
                  <div className="space-y-4">
                    {groups.map((g) => {
                      const owner = p.owners[g.concern];
                      const r = owner ? routingReason(owner, lang) : null;
                      const mineGroup = owner?.proId === me;
                      const rows = collapseRepeats(g.signals);
                      return (
                        <m.div layout key={g.key} transition={spring.snappy} className={`rounded-card border-2 p-3 ${SEV[g.peak].border}`}>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h4 className="font-bold">{concernLabel(g.concern, lang)}{g.subject === "baby" ? ` · ${tr("Baby")}` : ""}</h4>
                            <SeverityBadge severity={g.peak} />
                            <span className="text-xs font-semibold text-ink-muted">{tr("{n} alerts", { n: g.signals.length })} · {tr("latest")} {formatClock(g.lastAt, lang)}</span>
                            {r && owner && <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[r.tone]}`}>{r.chip}: {mineGroup ? tr("you") : owner.proName || tr("not assigned")}</span>}
                          </div>
                          {r && <p className="mb-2 text-xs text-ink-muted">{r.reason}</p>}
                          <ul className="space-y-2">
                            {dayRows(rows, lang).map((item) => item.kind === "day"
                              ? <li key={item.key} className="pt-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{item.label}</li>
                              : renderRow(item.row.signal, item.row.repeats))}
                          </ul>
                        </m.div>
                      );
                    })}
                  </div>
                )}
              </m.section>
            );
          })}
        </m.div>
      </LayoutGroup>
      <p className="flex items-center gap-1 text-xs text-ink-muted"><CircleCheck className="h-3.5 w-3.5" aria-hidden />{tr("Times are shown in Indian Standard Time.")}</p>
    </div>
  );
}

type RowItem = { kind: "day"; key: string; label: string } | { kind: "row"; row: ReturnType<typeof collapseRepeats>[number] };
/** Rows in time order with a heading each time the day changes (timeline by day; the full case timeline comes with the next challenge). */
function dayRows(rows: ReturnType<typeof collapseRepeats>, lang: "en" | "hi"): RowItem[] {
  const out: RowItem[] = [];
  let last = "";
  for (const row of rows) {
    const d = dayKey(row.signal.observedAt);
    if (d !== last) { out.push({ kind: "day", key: `d-${d}-${row.signal.id}`, label: formatDay(row.signal.observedAt, lang) }); last = d; }
    out.push({ kind: "row", row });
  }
  return out;
}
