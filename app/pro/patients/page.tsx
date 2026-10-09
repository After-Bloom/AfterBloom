"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { CheckCircle2, Users } from "lucide-react";
import { useApp } from "@/lib/store";
import { EPDS_CONFIG } from "@/lib/epds";
import { PageHead, Tabs, fmtDate } from "@/components/ui";
import { TrendChart, EpdsChart, BpChart } from "@/components/Charts";
import RelatedAlerts from "@/components/RelatedAlerts";
import { RISK_ITEMS, riskKeys } from "@/lib/risk";
import { useTr } from "@/lib/i18n";
import { rise, spring } from "@/lib/motion";
import { usePro } from "@/components/pro/ProProvider";
import { CallButton, CallbackTimer, TONE, URGENT, band, bandCls, reasonsOf, urgency } from "@/components/pro/parts";

/** One tab per patient. Inside: an overview, the related alerts for her, and her trends. */
export default function Patients() {
  const { auth } = useApp();
  const tr = useTr();
  const pd = usePro();
  const [sel, setSel] = useState<string | null>(null);
  const [part, setPart] = useState("overview");
  const logged = useRef<string | null>(null);

  const rows = useMemo(() => [...pd.rows].sort((a, b) => urgency(b) - urgency(a) || a.name.localeCompare(b.name)), [pd.rows]);

  // open the patient named in the link (?p=...), otherwise the one who needs attention first
  useEffect(() => {
    if (!rows.length || sel) return;
    const wanted = new URLSearchParams(window.location.search).get("p");
    setSel(rows.find((r) => r.id === wanted)?.id ?? rows[0].id);
  }, [rows, sel]);
  const choose = (id: string) => { setSel(id); setPart("overview"); window.history.replaceState(null, "", `/pro/patients?p=${id}`); };

  const selected = rows.find((r) => r.id === sel);

  // opening a record is logged (and the mother can see that)
  useEffect(() => {
    if (!selected || logged.current === selected.id) return;
    logged.current = selected.id;
    void pd.logView(selected.id, `Viewed record of ${selected.name}`).then(() => pd.reload());
  }, [selected?.id]); // eslint-disable-line

  if (pd.loading) return <div className="mx-auto max-w-5xl space-y-4" aria-busy="true"><div className="h-14 w-2/3 animate-pulse rounded bg-surface-2" />{[0, 1].map((i) => <div key={i} className="card h-32 animate-pulse bg-surface-2" />)}</div>;
  if (pd.error) return <div role="alert" className="card mx-auto max-w-xl text-warn">{tr("Could not load your patients. Please check your connection and try again.")}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHead title="Patients" sub="Choose a patient to see her alerts and her record. Every view of a record is logged." tag="Sample profile" />

      {rows.length === 0 && <div className="card flex items-center gap-3 text-ink-muted"><Users className="h-6 w-6" aria-hidden />{tr("No patients are matched with you yet.")}</div>}

      {/* one tab per patient, the colour dot shows who needs you */}
      {rows.length > 0 && (
        <div role="tablist" aria-label={tr("Patients")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {rows.map((r) => {
            const t = TONE[urgency(r) as 0 | 1 | 2 | 3];
            const on = r.id === sel;
            return (
              <button key={r.id} role="tab" aria-selected={on} onClick={() => choose(r.id)} className={`chip !gap-2 whitespace-nowrap ${on ? "chip-on" : ""}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-primary-on" : t.bar}`} aria-hidden />
                <span className="font-semibold">{tr(r.name)}</span>
                <span className={`text-xs ${on ? "opacity-80" : "text-ink-muted"}`}>{tr("Day {n}", { n: r.day })}</span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {selected && (
          <m.div key={selected.id} variants={rise} initial="hidden" animate="show" exit="exit" className="space-y-4">
            <div className="card flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-2xl">{tr(selected.name)}</h2>
                <p className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: selected.day })} · {tr(selected.delivery)}{selected.babyName ? ` · ${selected.babyName}` : ""}</p>
                <p className={`mt-1 text-sm font-bold ${TONE[urgency(selected) as 0 | 1 | 2 | 3].text}`}>{tr(TONE[urgency(selected) as 0 | 1 | 2 | 3].label)}</p>
              </div>
              <CallButton phone={selected.phone} />
            </div>

            <Tabs value={part} onChange={setPart} tabs={[{ id: "overview", label: "Overview" }, { id: "alerts", label: "Related alerts" }, { id: "trends", label: "Trends" }]} />

            {part === "overview" && (
              <div className="space-y-4">
                {!selected.shares && <p className="rounded-control bg-warn/10 p-3 text-sm font-semibold text-warn">{tr("She is not sharing her check-ins and screening results right now. You still see urgent flags.")}</p>}

                <section className="card space-y-3" aria-labelledby="open-h">
                  <h3 id="open-h" className="font-serif text-xl">{tr("Callbacks")}</h3>
                  {selected.flags.filter((f) => !f.resolved).length === 0 && <p className="flex items-center gap-2 text-sm text-ink-muted"><CheckCircle2 className="h-5 w-5 text-ok" aria-hidden />{tr("No pending callbacks.")}</p>}
                  {selected.flags.filter((f) => !f.resolved).map((f) => (
                    <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-surface-2 p-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold">{tr(f.text)}</p>
                        <CallbackTimer urgent={URGENT.includes(f.kind)} flaggedAt={new Date(f.date).getTime()} dueAt={new Date(f.dueAt).getTime()} />
                      </div>
                      <button className="btn-soft !py-2" onClick={() => pd.resolveFlag(f, selected.id)}><CheckCircle2 className="h-4 w-4" aria-hidden />{tr("Mark done")}</button>
                    </div>
                  ))}
                  {reasonsOf(selected).filter((x) => !selected.flags.some((f) => !f.resolved && x.startsWith(f.text))).length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 pt-1">{reasonsOf(selected).filter((x) => !selected.flags.some((f) => !f.resolved && x.startsWith(f.text))).map((x) => <li key={x} className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">{tr(x)}</li>)}</ul>
                  )}
                </section>

                {selected.shares && riskKeys(selected.risk).length > 0 && (
                  <section className="card" aria-labelledby="rp-h"><h3 id="rp-h" className="mb-1 font-serif text-xl">{tr("Recovery profile")}</h3><p className="text-sm">{riskKeys(selected.risk).map((k) => tr(RISK_ITEMS.find((x) => x.k === k)!.label)).join("; ")}</p></section>
                )}
                {selected.shares && selected.symptoms.length > 0 && (
                  <section className="card" aria-labelledby="sy-h"><h3 id="sy-h" className="mb-2 font-serif text-xl">{tr("AMBER/RED symptoms")}</h3>
                    <ul className="space-y-1 text-sm">{selected.symptoms.slice(0, 6).map((l, i) => <li key={i}>{fmtDate(l.date)} · {tr(l.level)} · {l.labels.map((x) => tr(x)).join(", ")}</li>)}</ul>
                  </section>
                )}
              </div>
            )}

            {part === "alerts" && <RelatedAlerts meId={auth.userId ?? ""} patientId={selected.id} />}

            {part === "trends" && (
              selected.shares ? (
                <div className="space-y-4">
                  <section className="card"><h3 className="mb-2 font-serif text-xl">{tr("EPDS bands and history")}</h3>
                    {selected.epds.length ? (<>
                      <EpdsChart data={selected.epds.map((e) => ({ d: fmtDate(e.date), score: e.total }))} possible={EPDS_CONFIG.possible} probable={EPDS_CONFIG.probable} />
                      <div className="mt-2 divide-y divide-line text-sm">{selected.epds.map((e, i) => <div key={i} className="flex items-center justify-between py-1.5"><span>{fmtDate(e.date)}{e.selfHarm ? " · Q10+" : ""}</span><span className="flex items-center gap-2"><b>{e.total}/30</b><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bandCls(e.total)}`}>{tr(band(e.total))}</span></span></div>)}</div>
                    </>) : <p className="text-sm text-ink-muted">{tr("No screening yet.")}</p>}
                  </section>
                  {selected.checkins.some((c) => c.bp) && <section className="card"><h3 className="mb-2 font-serif text-xl">{tr("Blood pressure")}</h3><BpChart data={selected.checkins.filter((c) => c.bp)} /></section>}
                  <section className="card"><h3 className="mb-2 font-serif text-xl">{tr("Mood, sleep, appetite")}</h3><TrendChart data={selected.checkins} height={200} /></section>
                </div>
              ) : <p className="card text-sm font-semibold text-warn">{tr("She is not sharing her check-ins and screening results right now. You still see urgent flags.")}</p>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
