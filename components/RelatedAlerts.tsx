"use client";
import { useMemo, useState } from "react";
import * as m from "motion/react-m";
import { LayoutGroup } from "motion/react";
import { CircleCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { useTr } from "@/lib/i18n";
import { Segmented } from "@/components/ui";
import { usePro } from "@/components/pro/ProProvider";
import { AlertRow, useSignalTitle } from "@/components/pro/AlertRow";
import { CaseCard } from "@/components/pro/CaseCard";
import { DemoControls } from "@/components/pro/DemoControls";
import { rise, stagger } from "@/lib/motion";
import type { PatientSignals, Signal } from "@/lib/types/cases";

// The professional's alerts, two ways over the same data:
//   Individual alerts: every alert on its own, newest first. This is the alert overload.
//   Grouped cases: the same alerts folded into one case per concern, each with its own timeline page. Nothing is deleted.

export default function RelatedAlerts({ meId, patientId }: { meId: string; patientId?: string }) {
  const { s } = useApp();
  const tr = useTr();
  const { sig } = usePro();
  const title = useSignalTitle();
  const me = sig.me || meId;
  const [view, setView] = useState<"individual" | "grouped">("individual");
  const [who, setWho] = useState<"care" | "mine">("care");
  const [busy, setBusy] = useState("");

  const decide = async (x: Signal, action: "confirm" | "unlink") => {
    setBusy(x.id);
    try { await fetch("/api/signals/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId: x.id, action }) }); await sig.reload(); }
    finally { setBusy(""); }
  };

  const titleOf = useMemo(() => {
    const byId = new Map<string, Signal>();
    (sig.data ?? []).forEach((p) => p.signals.forEach((x) => byId.set(x.id, x)));
    return (id: string | null) => (id && byId.get(id) ? title(byId.get(id)!) : undefined);
  }, [sig.data, s.lang]); // eslint-disable-line

  // "Mine" keeps what I own: the cases routed to me, and the alerts inside them
  const shown = useMemo(() => (sig.data ?? []).filter((p) => !patientId || p.id === patientId).map((p): PatientSignals => {
    if (who === "care") return p;
    const cases = p.cases.filter((c) => c.ownerProId === me);
    const ids = new Set(cases.map((c) => c.id));
    return { ...p, cases, signals: p.signals.filter((x) => (x.caseId ? ids.has(x.caseId) : p.owners[x.concern]?.proId === me)) };
  }).filter((p) => p.signals.length > 0 || p.cases.length > 0)
    .sort((a, b) => Number(b.signals.some((x) => x.severity === "red")) - Number(a.signals.some((x) => x.severity === "red")) || a.name.localeCompare(b.name)), [sig.data, who, me, patientId]);

  const total = shown.reduce((a, p) => a + p.signals.length, 0);
  const caseCount = shown.reduce((a, p) => a + p.cases.length, 0);
  const held = shown.reduce((a, p) => a + p.signals.filter((x) => !x.notified).length, 0);
  const overdue = shown.reduce((a, p) => a + p.cases.filter((c) => c.status !== "resolved" && c.priority !== "P4" && c.dueBy && new Date(c.dueBy).getTime() < Date.now()).length, 0);
  const openCases = shown.reduce((a, p) => a + p.cases.filter((c) => c.status !== "resolved").length, 0);
  const casesReady = (sig.data ?? []).some((p) => p.cases.length > 0) || (sig.data ?? []).every((p) => p.signals.length === 0);

  if (sig.problem === "not-ready") return <div role="status" className="card text-ink-muted">{tr("Related alerts need the latest database update (migration 007). Ask the administrator to run it, then refresh.")}</div>;
  if (!sig.data && sig.problem === "error") return <div role="alert" className="card text-warn">{tr("Could not load the related alerts. Please check your connection.")}</div>;
  if (!sig.data) return <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-surface-2" />)}</div>;

  const grouped = view === "grouped" && casesReady;
  const summary = grouped ? tr("{a} alerts into {b} cases", { a: total, b: caseCount }) : tr("{a} separate alerts", { a: total });

  return (
    <div className="space-y-4">
      {!patientId && <DemoControls onChange={() => void sig.reload()} onReplayStart={() => { setView("individual"); setWho("care"); }} />}
      {/* live counts: nothing here is typed in, they are worked out from the alerts below */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[total, "Alerts received", ""], [openCases, "Open cases", ""], [held, "Notifications held back", ""], [overdue, "Overdue", overdue ? "text-danger" : ""]].map(([n, l, tone]) => (
          <div key={l as string} className="card !p-4"><div className={`font-serif text-3xl leading-none ${(tone as string) || "text-plum-800"}`}>{n as number}</div><div className="mt-1 text-xs font-semibold text-ink-muted">{tr(l as string)}</div></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-80"><Segmented<"individual" | "grouped"> label="View" value={view} onChange={setView} options={[{ id: "individual", label: "Individual alerts" }, { id: "grouped", label: "Grouped cases" }]} /></div>
        <div className="w-full sm:w-64"><Segmented<"care" | "mine"> label="Whose" value={who} onChange={setWho} options={[{ id: "care", label: "Care team" }, { id: "mine", label: "Mine" }]} /></div>
        <p className="text-sm font-semibold text-plum-800" aria-live="polite">{summary}</p>
      </div>
      <p className="text-xs text-ink-muted">{tr("Same data, nothing deleted. Grouping only changes how the alerts are laid out, and a rise in severity, a new concern or any safety alert always reaches the care team.")}</p>
      {view === "grouped" && !casesReady && <p role="status" className="rounded-control bg-warn/10 p-3 text-sm font-semibold text-warn">{tr("Cases need the latest database update (migration 008). Showing the alerts one by one until it is run.")}</p>}

      {shown.length === 0 && <div className="card text-ink-muted">{who === "mine" ? tr("Nothing is assigned to you right now.") : tr("No related alerts yet. They appear here as soon as a mother checks in or uses the symptom checker.")}</div>}

      <LayoutGroup>
        <m.div variants={stagger()} initial="hidden" animate="show" className="space-y-5">
          {shown.map((p) => (
            <m.section variants={rise} key={p.id} aria-label={p.name} className="card space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-xl">{tr(p.name)} <span className="text-sm font-normal text-ink-muted">· {tr("Day {n} postpartum", { n: p.day })}</span></h3>
                <span className="text-xs font-semibold text-ink-muted">{grouped ? tr("{a} alerts into {b} cases", { a: p.signals.length, b: p.cases.length }) : tr("{a} separate alerts", { a: p.signals.length })}</span>
              </div>
              {!p.shares && <p className="rounded-control bg-warn/10 p-2 text-xs font-semibold text-warn">{tr("She is not sharing her check-ins and screening results right now. You see red and safety alerts only, without the details.")}</p>}

              {grouped ? (
                <ul className="grid gap-3 md:grid-cols-2">
                  {[...p.cases].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || (a.priority ?? "P4").localeCompare(b.priority ?? "P4") || b.lastSignalAt.localeCompare(a.lastSignalAt)).map((c) => (
                    <li key={c.id}><CaseCard c={c} signals={p.signals} me={me} /></li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {[...p.signals].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).map((x) => <AlertRow key={x.id} sig={x} parentTitle={titleOf(x.relatedTo)} busy={busy === x.id} onDecide={decide} />)}
                </ul>
              )}
            </m.section>
          ))}
        </m.div>
      </LayoutGroup>
      <p className="flex items-center gap-1 text-xs text-ink-muted"><CircleCheck className="h-3.5 w-3.5" aria-hidden />{tr("Times are shown in Indian Standard Time.")}</p>
    </div>
  );
}
