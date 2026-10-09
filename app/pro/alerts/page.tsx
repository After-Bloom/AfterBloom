"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import * as m from "motion/react-m";
import { AlertOctagon, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHead, Tabs, fmtTime } from "@/components/ui";
import RelatedAlerts from "@/components/RelatedAlerts";
import { useTr } from "@/lib/i18n";
import { rise, stagger } from "@/lib/motion";
import { usePro } from "@/components/pro/ProProvider";
import { CallButton, CallbackTimer, TONE, URGENT, urgency } from "@/components/pro/parts";

/** Alerts: the callbacks waiting for you, one card per patient, and the related alerts grouped by concern. */
export default function Alerts() {
  const { auth } = useApp();
  const tr = useTr();
  const pd = usePro();
  const [tab, setTab] = useState("callbacks");

  const withCallbacks = useMemo(() => pd.rows
    .map((r) => ({ r, open: r.flags.filter((f) => !f.resolved).sort((a, b) => Number(URGENT.includes(b.kind)) - Number(URGENT.includes(a.kind)) || a.dueAt.localeCompare(b.dueAt)) }))
    .filter((x) => x.open.length > 0)
    .sort((a, b) => urgency(b.r) - urgency(a.r) || a.r.name.localeCompare(b.r.name)), [pd.rows]);
  const total = withCallbacks.reduce((a, x) => a + x.open.length, 0);

  if (pd.loading) return <div className="mx-auto max-w-4xl space-y-4" aria-busy="true"><div className="h-14 w-2/3 animate-pulse rounded bg-surface-2" />{[0, 1].map((i) => <div key={i} className="card h-32 animate-pulse bg-surface-2" />)}</div>;
  if (pd.error) return <div role="alert" className="card mx-auto max-w-xl text-warn">{tr("Could not load your patients. Please check your connection and try again.")}</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHead title="Alerts" sub="Callbacks waiting for you, and how a mother's alerts fit together." tag="Sample profile" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "callbacks", label: tr("Callbacks ({n})", { n: total }) }, { id: "related", label: "Related alerts" }]} />

      {tab === "callbacks" && (
        <div className="space-y-4">
          {withCallbacks.length === 0 && <div className="card flex items-center gap-3 text-ink-muted"><CheckCircle2 className="h-6 w-6 text-ok" aria-hidden />{tr("No pending callbacks.")}</div>}
          <m.ul variants={stagger()} initial="hidden" animate="show" className="space-y-4">
            {withCallbacks.map(({ r, open }) => {
              const t = TONE[urgency(r) as 0 | 1 | 2 | 3];
              return (
                <m.li variants={rise} key={r.id} className={`card relative overflow-hidden !p-0 ${t.ring}`}>
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${t.bar}`} aria-hidden />
                  <div className="space-y-3 p-4 pl-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1"><h3 className="font-serif text-xl">{tr(r.name)} <span className="text-sm font-normal text-ink-muted">· {tr("Day {n} postpartum", { n: r.day })}</span></h3></div>
                      <CallButton phone={r.phone} small />
                      <Link href={`/pro/patients?p=${r.id}`} className="btn-ghost !py-2">{tr("Open patient")}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
                    </div>
                    <ul className="space-y-2">
                      {open.map((f) => {
                        const urgent = URGENT.includes(f.kind);
                        return (
                          <li key={f.id} className={`flex flex-wrap items-center gap-3 rounded-control border p-3 ${urgent ? "border-danger/40 bg-danger/10" : "border-line bg-surface-2"}`}>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="flex items-center gap-1.5 font-semibold">{urgent && <AlertOctagon className="h-4 w-4 shrink-0 text-danger" aria-hidden />}{tr(f.text)}</p>
                              <p className="flex items-center gap-1 text-xs text-ink-muted"><Clock className="h-3.5 w-3.5" aria-hidden />{tr("Flagged")} {fmtTime(f.date)}</p>
                              <CallbackTimer urgent={urgent} flaggedAt={new Date(f.date).getTime()} dueAt={new Date(f.dueAt).getTime()} />
                            </div>
                            <button className="btn-soft !py-2" onClick={() => pd.resolveFlag(f, r.id)}><CheckCircle2 className="h-4 w-4" aria-hidden />{tr("Mark done")}</button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </m.li>
              );
            })}
          </m.ul>
        </div>
      )}

      {tab === "related" && <RelatedAlerts meId={auth.userId ?? ""} />}
    </div>
  );
}
