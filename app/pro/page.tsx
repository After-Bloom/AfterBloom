"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { AlertOctagon, CheckCircle2, Clock, Phone, Users } from "lucide-react";
import { useApp, daysSince } from "@/lib/store";
import { SAMPLE_PATIENTS } from "@/lib/pros";
import { EPDS_CONFIG } from "@/lib/epds";
import { PageHead, Tabs, fmtTime, fmtDate } from "@/components/ui";
import { TrendChart, EpdsChart } from "@/components/Charts";
import { useTr } from "@/lib/i18n";
import { useNow } from "@/lib/useNow";
import { rise, spring, stagger } from "@/lib/motion";

type Row = { id: string; name: string; day: number; urgency: number; tags: string[]; epds: { d: string; score: number }[]; live?: boolean; flaggedAt?: number; dueAt?: number; urgentFlag?: boolean };

const band = (n: number) => (n >= EPDS_CONFIG.probable ? "Probable" : n >= EPDS_CONFIG.possible ? "Possible" : "Low");
const bandCls = (n: number) => (n >= EPDS_CONFIG.probable ? "bg-danger/15 text-danger" : n >= EPDS_CONFIG.possible ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok");

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

export default function Pro() {
  const { s, set, audit } = useApp();
  const tr = useTr();
  const [tab, setTab] = useState("patients");
  const [sel, setSel] = useState<string | null>(null);
  const t0 = useRef(Date.now());
  const open = s.flags.filter((f) => !f.resolved);
  const urgentOpen = open.filter((f) => f.kind === "q10" || f.kind === "red" || f.kind === "selfharm");
  const epdsOpen = open.find((f) => f.kind === "epds");

  const rows: Row[] = useMemo(() => [
    {
      id: "live", name: `${s.mother.name} Verma`, day: daysSince(s.mother.birth), live: true,
      urgency: urgentOpen.length ? 3 : open.length ? 2 : 0, urgentFlag: urgentOpen.length > 0,
      tags: [...(urgentOpen.length ? ["URGENT FLAG"] : []), ...open.filter((f) => f.kind === "epds").map(() => "Probable depression")],
      epds: s.epds.slice().reverse().map((e) => ({ d: fmtDate(e.date), score: e.total })),
      flaggedAt: epdsOpen ? new Date(epdsOpen.date).getTime() : undefined, dueAt: epdsOpen ? new Date(epdsOpen.dueAt).getTime() : undefined,
    },
    ...SAMPLE_PATIENTS.map((p): Row => {
      const flaggedAt = p.flaggedAgoH ? t0.current - p.flaggedAgoH * 3600000 : undefined;
      return { id: p.id, name: p.name, day: p.day, urgency: p.tags.some((t) => t.includes("Probable")) ? 2 : p.tags.length ? 1 : 0, tags: p.tags, epds: p.epds.map((e) => ({ d: e.d, score: e.score })), flaggedAt, dueAt: flaggedAt ? flaggedAt + 48 * 3600000 : undefined };
    }),
  ].sort((a, b) => b.urgency - a.urgency), [s, urgentOpen.length, open.length, epdsOpen]); // eslint-disable-line

  const selected = rows.find((r) => r.id === sel);
  useEffect(() => { if (selected) audit("Dr. Ananya Rao (sample)", `Viewed record of ${selected.name}`); }, [sel]); // eslint-disable-line

  const chart = (r: Row) => {
    if (r.live) return s.checkins;
    const p = SAMPLE_PATIENTS.find((x) => x.id === r.id)!;
    return p.mood.map((mo, i) => ({ date: new Date(Date.now() - (p.mood.length - i) * 86400000).toISOString(), mood: mo, appetite: mo, sleepHours: p.sleep[i] }));
  };
  const resolve = (id: string, text: string) => { set((p) => ({ ...p, flags: p.flags.map((x) => (x.id === id ? { ...x, resolved: true } : x)) })); audit("Dr. Ananya Rao (sample)", `Completed callback: ${text}`); };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead title={tr("Dr. Ananya Rao's dashboard")} sub="Sorted by urgency. Every view of a record is logged." tag="Sample profile" />

      {/* urgent flags always sit above everything else */}
      <AnimatePresence initial={false}>
        {urgentOpen.map((f) => (
          <m.div key={f.id} variants={rise} initial="hidden" animate="show" exit="exit" role="alert" className="flex flex-wrap items-center gap-3 rounded-card border-2 border-danger bg-danger/10 p-4">
            <AlertOctagon className="h-7 w-7 shrink-0 text-danger" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-danger">{tr("URGENT: immediate callback")} · {tr(s.mother.name + " Verma")}</p>
              <p className="text-sm text-ink">{tr(f.text)} · {fmtTime(f.date)}</p>
            </div>
            <a href="tel:+910000000000" className="btn bg-danger text-white dark:text-[#1C1117]"><Phone className="h-4 w-4" aria-hidden />{tr("Call")}</a>
            <button className="btn-ghost" onClick={() => { setTab("patients"); setSel("live"); }}>{tr("Open record")}</button>
          </m.div>
        ))}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3">
        {[{ n: rows.length, l: "Patients", i: Users }, { n: urgentOpen.length, l: "Urgent", i: AlertOctagon }, { n: open.length, l: "Open callbacks", i: Phone }].map((x) => (
          <div key={x.l} className="card flex items-center gap-3 !p-4"><x.i className="h-5 w-5 shrink-0 text-primary" aria-hidden /><div><div className="font-serif text-3xl leading-none text-plum-800">{x.n}</div><div className="text-xs font-semibold text-ink-muted">{tr(x.l)}</div></div></div>
        ))}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ id: "patients", label: "Patients" }, { id: "callbacks", label: tr("Callbacks ({n})", { n: open.length }) }, { id: "mod", label: tr("Moderation ({n})", { n: s.mod.filter((x) => !x.done).length }) }, { id: "audit", label: "Audit log" }]} />

      {tab === "patients" && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <m.ul variants={stagger()} initial="hidden" animate="show" className="space-y-2">
            {rows.map((r) => {
              const last = r.epds[r.epds.length - 1];
              const on = sel === r.id;
              return (
                <m.li key={r.id} variants={rise} className="relative">
                  {on && <m.span layoutId="patient-ring" transition={spring.snappy} className="absolute -inset-0.5 rounded-[26px] border-2 border-primary" />}
                  <button onClick={() => setSel(r.id)} aria-pressed={on} className={`card relative w-full text-left !p-4 ${r.urgency === 3 ? "!border-danger/60 bg-danger/10" : ""}`}>
                    <div className="flex items-center justify-between gap-2"><b className="min-w-0 truncate">{tr(r.name)}</b>{r.urgency === 3 && <AlertOctagon className="h-5 w-5 shrink-0 text-danger" aria-label={tr("URGENT FLAG")} />}</div>
                    <div className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: r.day })}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {r.tags.map((t) => <span key={t} className={`rounded-full px-2 py-0.5 text-xs font-bold ${t === "URGENT FLAG" ? "bg-danger text-white dark:text-[#1C1117]" : "bg-warn/15 text-warn"}`}>{tr(t)}</span>)}
                      {!r.tags.length && <span className="text-xs font-semibold text-ok">{tr("No flags")}</span>}
                      {last && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bandCls(last.score)}`}>EPDS {tr(band(last.score))}</span>}
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
                    <div><h2 className="font-serif text-2xl">{tr(selected.name)}</h2><p className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: selected.day })}</p></div>
                    {selected.live && urgentOpen.length === 0 && open.length === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-ok/15 px-3 py-1 text-sm font-bold text-ok"><CheckCircle2 className="h-4 w-4" aria-hidden />{tr("No flags")}</span>}
                  </div>
                  {(selected.urgentFlag || (selected.flaggedAt && selected.dueAt)) && (
                    <section aria-label={tr("Callback")} className="rounded-control border border-line bg-surface-2 p-4">
                      <CallbackTimer urgent={selected.urgentFlag} flaggedAt={selected.flaggedAt ?? t0.current} dueAt={selected.dueAt ?? t0.current} />
                    </section>
                  )}
                  <section>
                    <h3 className="mb-2 font-bold">{tr("EPDS bands and history")}</h3>
                    {selected.epds.length ? (
                      <>
                        <EpdsChart data={selected.epds.map((e) => ({ d: e.d, score: e.score }))} possible={EPDS_CONFIG.possible} probable={EPDS_CONFIG.probable} />
                        <div className="mt-2 divide-y divide-line text-sm">{selected.epds.map((e, i) => <div key={i} className="flex items-center justify-between py-1.5"><span>{tr(e.d)}</span><span className="flex items-center gap-2"><b>{e.score}/30</b><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bandCls(e.score)}`}>{tr(band(e.score))}</span></span></div>)}</div>
                      </>
                    ) : <p className="text-sm text-ink-muted">{tr("No screening yet.")}</p>}
                  </section>
                  <section><h3 className="mb-2 font-bold">{tr("Mood, sleep, appetite")}</h3><TrendChart data={chart(selected)} height={200} /></section>
                  {selected.live && (
                    <section><h3 className="mb-2 font-bold">{tr("AMBER/RED symptoms")}</h3>
                      {s.symptomLogs.filter((l) => l.level !== "GREEN").map((l, i) => <div key={i} className="text-sm">{fmtDate(l.date)} · {tr(l.level)} · {l.labels.map((x) => tr(x)).join(", ")}</div>)}
                      {!s.symptomLogs.some((l) => l.level !== "GREEN") && <p className="text-sm text-ink-muted">{tr("None.")}</p>}
                    </section>
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
          {open.length === 0 && <div className="card text-ink-muted">{tr("No pending callbacks. Try an EPDS score of 13+ or question 10 as Priya.")}</div>}
          {open.map((f) => {
            const urgent = f.kind !== "epds";
            return (
              <div key={f.id} className={`card ${urgent ? "!border-danger/60 bg-danger/10" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className={`font-bold ${urgent ? "text-danger" : ""}`}>{urgent ? tr("URGENT: immediate callback") : tr("Callback within 24-48 h")} · {tr(s.mother.name + " Verma")}</div>
                    <div className="text-sm">{tr(f.text)}</div>
                    <div className="flex items-center gap-1 text-xs text-ink-muted"><Clock className="h-3.5 w-3.5" aria-hidden />{tr("Flagged")} {fmtTime(f.date)}</div>
                    {!urgent && <div className="pt-1"><CallbackTimer flaggedAt={new Date(f.date).getTime()} dueAt={new Date(f.dueAt).getTime()} /></div>}
                  </div>
                  <div className="flex gap-2"><a href="tel:+910000000000" className="btn-primary !py-2"><Phone className="h-4 w-4" aria-hidden />{tr("Call")}</a><button className="btn-ghost !py-2" onClick={() => resolve(f.id, f.text)}>{tr("Mark done")}</button></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "mod" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">{tr("Messages flagged for self-harm language in Bloom Circles. The software never replies on its own; a human decides.")}</p>
          {s.mod.filter((x) => !x.done).length === 0 && <div className="card text-ink-muted">{tr("Queue is empty. Post self-harm language in the Circle to test.")}</div>}
          {s.mod.filter((x) => !x.done).map((x) => (
            <div key={x.id} className="card !border-danger/50">
              <div className="text-xs font-bold text-danger">{tr(x.reason)} · {fmtTime(x.at)}</div>
              <p className="my-2">"{x.text}"</p>
              <div className="flex gap-2">
                <button className="btn-primary !py-2" onClick={() => set((p) => ({ ...p, mod: p.mod.map((y) => (y.id === x.id ? { ...y, done: true } : y)) }))}>{tr("Reach out to her")}</button>
                <button className="btn-ghost !py-2" onClick={() => set((p) => ({ ...p, posts: p.posts.map((y) => (y.id === x.postId ? { ...y, hidden: true } : y)), mod: p.mod.map((y) => (y.id === x.id ? { ...y, done: true } : y)) }))}>{tr("Hide post")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div className="card">{s.audit.map((a, i) => <div key={i} className="border-b border-line py-2 text-sm last:border-0"><span className="text-ink-muted">{fmtTime(a.at)}</span> · <b>{tr(a.who)}</b>: {tr(a.what)}</div>)}</div>
      )}
    </div>
  );
}
