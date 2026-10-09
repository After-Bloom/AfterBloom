"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { AlertOctagon, CalendarClock, CheckCircle2, Clock, Phone, Users, Video } from "lucide-react";
import { useApp } from "@/lib/store";
import { PatientRow, useProData } from "@/lib/data/pro";
import { EPDS_CONFIG } from "@/lib/epds";
import { PageHead, Tabs, fmtTime, fmtDate } from "@/components/ui";
import { TrendChart, EpdsChart, BpChart } from "@/components/Charts";
import { RISK_ITEMS, riskKeys, riskTier, bpTrend } from "@/lib/risk";
import { useTr } from "@/lib/i18n";
import { useNow } from "@/lib/useNow";
import { roomUrl, canJoin } from "@/lib/slots";
import { rise, spring, stagger } from "@/lib/motion";
import { ProQuestions, useProQuestions } from "@/components/ProQuestions";

const band = (n: number) => (n >= EPDS_CONFIG.probable ? "Probable" : n >= EPDS_CONFIG.possible ? "Possible" : "Low");
const bandCls = (n: number) => (n >= EPDS_CONFIG.probable ? "bg-danger/15 text-danger" : n >= EPDS_CONFIG.possible ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok");
const URGENT = ["q10", "red", "selfharm"];

/** 24 to 48 hour callback window. Urgent flags need an immediate callback, so no countdown. */
function CallbackTimer({ flaggedAt, dueAt, urgent }: { flaggedAt: number; dueAt: number; urgent?: boolean }) {
  const tr = useTr();
  const now = useNow(30000);
  if (urgent) return <div className="flex items-center gap-2 rounded-control bg-danger/15 px-3 py-2 font-bold text-danger"><AlertOctagon className="h-4 w-4" aria-hidden />{tr("URGENT: immediate callback")}</div>;
  const left = dueAt - now;
  const total = Math.max(1, dueAt - flaggedAt);
  const used = Math.min(1, Math.max(0, 1 - left / total));
  const over = left <= 0, soon = left < 6 * 3600000;
  const h = Math.floor(Math.abs(left) / 3600000), mm = Math.floor((Math.abs(left) % 3600000) / 60000);
  const tone = over ? "text-danger" : soon ? "text-warn" : "text-ok";
  return (
    <div>
      <div className={`flex items-center gap-2 font-bold ${tone}`}><Clock className="h-4 w-4" aria-hidden />{over ? tr("Overdue by {h}h {m}m", { h, m: mm }) : tr("Callback due in {h}h {m}m", { h, m: mm })}</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)} aria-label={tr("Callback window used")}>
        <m.div className={`h-full rounded-full ${over ? "bg-danger" : soon ? "bg-warn" : "bg-ok"}`} initial={false} animate={{ width: `${used * 100}%` }} transition={spring.gentle} />
      </div>
    </div>
  );
}

const raisedBp = (r: PatientRow) => { const l = r.checkins.filter((c) => c.bp).slice(-1)[0]; return !!bpTrend(r.checkins) || (!!l && Date.now() - new Date(l.date).getTime() < 3 * 86400000 && (l.bp!.sys >= 140 || l.bp!.dia >= 90)); };
const urgency = (r: PatientRow) => {
  const open = r.flags.filter((f) => !f.resolved);
  return open.some((f) => URGENT.includes(f.kind)) || r.loop?.status === "worse" || r.loop?.status === "cant_reach" || (r.loop?.status === "no_answer" && r.loop.level === "RED") ? 3 : open.length ? 2 : r.epds.some((e) => e.total >= EPDS_CONFIG.possible) ? 1 : 0;
};

export default function Pro() {
  const { auth } = useApp();
  const tr = useTr();
  const pd = useProData();
  const pq = useProQuestions(); // Ask Bloom questions patients chose to send
  const [tab, setTab] = useState("patients");
  const [sel, setSel] = useState<string | null>(null);
  const logged = useRef<string | null>(null);

  const rows = useMemo(() => [...pd.rows].sort((a, b) => urgency(b) - urgency(a) || a.name.localeCompare(b.name)), [pd.rows]);
  const selected = rows.find((r) => r.id === sel);
  const urgentFlags = rows.flatMap((r) => r.flags.filter((f) => !f.resolved && URGENT.includes(f.kind)).map((f) => ({ f, r })));
  const openFlags = rows.flatMap((r) => r.flags.filter((f) => !f.resolved).map((f) => ({ f, r })));
  const name = (id: string) => rows.find((r) => r.id === id)?.name ?? "";

  // opening a record is logged (and the mother can see that)
  useEffect(() => {
    if (!selected || logged.current === selected.id) return;
    logged.current = selected.id;
    void pd.logView(selected.id, `Viewed record of ${selected.name}`).then(() => pd.reload());
  }, [selected?.id]); // eslint-disable-line

  if (pd.loading) return <div className="mx-auto max-w-6xl space-y-4" aria-busy="true"><div className="h-14 w-2/3 animate-pulse rounded bg-surface-2" />{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-surface-2" />)}</div>;
  if (pd.error) return <div role="alert" className="card mx-auto max-w-xl text-warn">{tr("Could not load your patients. Please check your connection and try again.")}</div>;

  const callBtn = (r?: PatientRow) => r?.phone ? <a href={`tel:${r.phone}`} className="btn-primary !py-2"><Phone className="h-4 w-4" aria-hidden />{tr("Call")}</a> : <span className="rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-muted">{tr("No phone number on file")}</span>;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead title={tr("{name}'s dashboard", { name: auth.name })} sub="Sorted by urgency. Every view of a record is logged." tag="Sample profile" />

      {/* urgent flags always sit above everything else */}
      <AnimatePresence initial={false}>
        {urgentFlags.map(({ f, r }) => (
          <m.div key={f.id} variants={rise} initial="hidden" animate="show" exit="exit" role="alert" className="flex flex-wrap items-center gap-3 rounded-card border-2 border-danger bg-danger/10 p-4">
            <AlertOctagon className="h-7 w-7 shrink-0 text-danger" aria-hidden />
            <div className="min-w-0 flex-1"><p className="font-bold text-danger">{tr("URGENT: immediate callback")} · {tr(r.name)}</p><p className="text-sm text-ink">{tr(f.text)} · {fmtTime(f.date)}</p></div>
            {callBtn(r)}
            <button className="btn-ghost" onClick={() => { setTab("patients"); setSel(r.id); }}>{tr("Open record")}</button>
            <button className="btn-soft" onClick={() => pd.resolveFlag(f, r.id)}>{tr("Mark done")}</button>
          </m.div>
        ))}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3">
        {[{ n: rows.length, l: "Patients", i: Users }, { n: urgentFlags.length, l: "Urgent", i: AlertOctagon }, { n: openFlags.length, l: "Open callbacks", i: Phone }].map((x) => (
          <div key={x.l} className="card flex items-center gap-3 !p-4"><x.i className="h-5 w-5 shrink-0 text-primary" aria-hidden /><div><div className="font-serif text-3xl leading-none text-plum-800">{x.n}</div><div className="text-xs font-semibold text-ink-muted">{tr(x.l)}</div></div></div>
        ))}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ id: "patients", label: "Patients" }, { id: "callbacks", label: tr("Callbacks ({n})", { n: openFlags.length }) }, { id: "sessions", label: tr("Sessions ({n})", { n: pd.bookings.length }) }, { id: "questions", label: tr("Questions ({n})", { n: pq.open }) }, { id: "audit", label: "Audit log" }]} />

      {tab === "patients" && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          {rows.length === 0 && <div className="card text-ink-muted">{tr("No patients are matched with you yet.")}</div>}
          <m.ul variants={stagger()} initial="hidden" animate="show" className="space-y-2">
            {rows.map((r) => {
              const last = r.epds[r.epds.length - 1];
              const on = sel === r.id, u = urgency(r);
              const tags = [...(u === 3 ? ["URGENT FLAG"] : []), ...(r.flags.some((f) => !f.resolved && f.kind === "epds") ? ["Callback due"] : []), ...(r.loop ? ["No follow-up reply"] : []), ...(r.shares && raisedBp(r) ? ["Raised BP"] : []), ...(riskTier(r.risk) === "high" ? ["High-risk history"] : [])];
              return (
                <m.li key={r.id} variants={rise} className="relative">
                  {on && <m.span layoutId="patient-ring" transition={spring.snappy} className="absolute -inset-0.5 rounded-[26px] border-2 border-primary" />}
                  <button onClick={() => setSel(r.id)} aria-pressed={on} className={`card relative w-full text-left !p-4 ${u === 3 ? "!border-danger/60 bg-danger/10" : ""}`}>
                    <div className="flex items-center justify-between gap-2"><b className="min-w-0 truncate">{tr(r.name)}</b>{u === 3 && <AlertOctagon className="h-5 w-5 shrink-0 text-danger" aria-label={tr("URGENT FLAG")} />}</div>
                    <div className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: r.day })}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {tags.map((t) => <span key={t} className={`rounded-full px-2 py-0.5 text-xs font-bold ${t === "URGENT FLAG" ? "bg-danger text-white dark:text-[#1C1117]" : "bg-warn/15 text-warn"}`}>{tr(t)}</span>)}
                      {!tags.length && <span className="text-xs font-semibold text-ok">{tr("No flags")}</span>}
                      {last && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bandCls(last.total)}`}>EPDS {tr(band(last.total))}</span>}
                    </div>
                  </button>
                </m.li>
              );
            })}
          </m.ul>

          <div>
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <m.div key={selected.id} variants={rise} initial="hidden" animate="show" exit="exit" className="card space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h2 className="font-serif text-2xl">{tr(selected.name)}</h2><p className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: selected.day })} · {tr(selected.delivery)} · {selected.babyName}</p></div>
                    {callBtn(selected)}
                  </div>
                  {selected.flags.filter((f) => !f.resolved).map((f) => (
                    <section key={f.id} aria-label={tr("Callback")} className="space-y-2 rounded-control border border-line bg-surface-2 p-4">
                      <p className="font-semibold">{tr(f.text)}</p>
                      <CallbackTimer urgent={URGENT.includes(f.kind)} flaggedAt={new Date(f.date).getTime()} dueAt={new Date(f.dueAt).getTime()} />
                      <button className="btn-soft !py-2" onClick={() => pd.resolveFlag(f, selected.id)}><CheckCircle2 className="h-4 w-4" aria-hidden />{tr("Mark done")}</button>
                    </section>
                  ))}
                  {!selected.shares && <p className="rounded-control bg-warn/10 p-3 text-sm font-semibold text-warn">{tr("She is not sharing her check-ins and screening results right now. You still see urgent flags.")}</p>}
                  {selected.shares && (
                    <>
                      <section><h3 className="mb-2 font-bold">{tr("EPDS bands and history")}</h3>
                        {selected.epds.length ? (<>
                          <EpdsChart data={selected.epds.map((e) => ({ d: fmtDate(e.date), score: e.total }))} possible={EPDS_CONFIG.possible} probable={EPDS_CONFIG.probable} />
                          <div className="mt-2 divide-y divide-line text-sm">{selected.epds.map((e, i) => <div key={i} className="flex items-center justify-between py-1.5"><span>{fmtDate(e.date)}{e.selfHarm ? " · Q10+" : ""}</span><span className="flex items-center gap-2"><b>{e.total}/30</b><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bandCls(e.total)}`}>{tr(band(e.total))}</span></span></div>)}</div>
                        </>) : <p className="text-sm text-ink-muted">{tr("No screening yet.")}</p>}
                      </section>
                      {riskKeys(selected.risk).length > 0 && <section><h3 className="mb-2 font-bold">{tr("Recovery profile")}</h3><p className="text-sm">{riskKeys(selected.risk).map((k) => tr(RISK_ITEMS.find((x) => x.k === k)!.label)).join("; ")}</p></section>}
                      {selected.checkins.some((c) => c.bp) && <section><h3 className="mb-2 font-bold">{tr("Blood pressure")}</h3><BpChart data={selected.checkins.filter((c) => c.bp)} /></section>}
                      <section><h3 className="mb-2 font-bold">{tr("Mood, sleep, appetite")}</h3><TrendChart data={selected.checkins} height={200} /></section>
                      <section><h3 className="mb-2 font-bold">{tr("AMBER/RED symptoms")}</h3>
                        {selected.symptoms.map((l, i) => <div key={i} className="text-sm">{fmtDate(l.date)} · {tr(l.level)} · {l.labels.map((x) => tr(x)).join(", ")}</div>)}
                        {!selected.symptoms.length && <p className="text-sm text-ink-muted">{tr("None.")}</p>}
                      </section>
                    </>
                  )}
                </m.div>
              ) : (
                <m.div key="none" variants={rise} initial="hidden" animate="show" exit="exit" className="card text-ink-muted">{tr("Select a patient to see their record.")}</m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {tab === "callbacks" && (
        <div className="space-y-3">
          {openFlags.length === 0 && <div className="card text-ink-muted">{tr("No pending callbacks.")}</div>}
          {openFlags.map(({ f, r }) => {
            const urgent = URGENT.includes(f.kind);
            return (
              <div key={f.id} className={`card ${urgent ? "!border-danger/60 bg-danger/10" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className={`font-bold ${urgent ? "text-danger" : ""}`}>{urgent ? tr("URGENT: immediate callback") : tr("Callback within 24-48 h")} · {tr(r.name)}</div>
                    <div className="text-sm">{tr(f.text)}</div>
                    <div className="flex items-center gap-1 text-xs text-ink-muted"><Clock className="h-3.5 w-3.5" aria-hidden />{tr("Flagged")} {fmtTime(f.date)}</div>
                    {!urgent && <div className="pt-1"><CallbackTimer flaggedAt={new Date(f.date).getTime()} dueAt={new Date(f.dueAt).getTime()} /></div>}
                  </div>
                  <div className="flex gap-2">{callBtn(r)}<button className="btn-ghost !py-2" onClick={() => pd.resolveFlag(f, r.id)}>{tr("Mark done")}</button></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-3">
          {pd.bookings.length === 0 && <div className="card text-ink-muted">{tr("No sessions booked.")}</div>}
          {pd.bookings.map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center gap-3 !p-4">
              <CalendarClock className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1"><div className="font-bold">{tr(name(b.motherId) || "Patient")}</div><div className="text-sm text-ink-muted">{fmtTime(b.startsAt)}</div></div>
              <a href={canJoin(b.startsAt) ? roomUrl(b.room) : undefined} target="_blank" rel="noreferrer" aria-disabled={!canJoin(b.startsAt)} className={`btn-primary ${canJoin(b.startsAt) ? "" : "pointer-events-none opacity-50"}`}><Video className="h-4 w-4" aria-hidden />{tr("Join video call")}</a>
            </div>
          ))}
        </div>
      )}

      {tab === "questions" && <ProQuestions items={pq.items} reload={pq.reload} />}

      {tab === "audit" && (
        <div className="card">
          {pd.audit.length === 0 && <p className="text-sm text-ink-muted">{tr("Nothing yet.")}</p>}
          {pd.audit.map((a, i) => <div key={i} className="border-b border-line py-2 text-sm last:border-0"><span className="text-ink-muted">{fmtTime(a.at)}</span> · {tr(a.action)}</div>)}
        </div>
      )}
    </div>
  );
}
