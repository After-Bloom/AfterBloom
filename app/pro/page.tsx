"use client";
import { useMemo } from "react";
import Link from "next/link";
import * as m from "motion/react-m";
import { AlertOctagon, ArrowRight, CalendarClock, CheckCircle2, Phone, Users, Video } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHead, fmtTime } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { canJoin, roomUrl } from "@/lib/slots";
import { rise, stagger } from "@/lib/motion";
import { usePro } from "@/components/pro/ProProvider";
import { CallButton, TONE, URGENT, reasonsOf, urgency } from "@/components/pro/parts";
import { caseTitle } from "@/lib/labels";
import { DueCountdown, PriorityChip } from "@/components/pro/Priority";
import type { Priority } from "@/lib/workflow/priority";

/** The dashboard: who needs you right now, one card per patient. Everything else lives under Patients, Alerts, Sessions and Audit log. */
export default function ProHome() {
  const { auth, s } = useApp();
  const tr = useTr();
  const pd = usePro();

  const rows = useMemo(() => [...pd.rows].sort((a, b) => urgency(b) - urgency(a) || a.name.localeCompare(b.name)), [pd.rows]);
  const openCases = (id: string) => (pd.sig.data?.find((p) => p.id === id)?.cases ?? []).filter((c) => c.status !== "resolved").sort((a, b) => (a.priority ?? "P4").localeCompare(b.priority ?? "P4"));
  const needing = rows.filter((r) => urgency(r) >= 2 || reasonsOf(r).length > 0 || openCases(r.id).length > 0);
  const calm = rows.filter((r) => !needing.includes(r));
  const urgentCount = rows.filter((r) => urgency(r) === 3).length;
  const callbacks = rows.reduce((a, r) => a + r.flags.filter((f) => !f.resolved).length, 0);
  const next = pd.bookings[0];
  const nextWho = next ? rows.find((r) => r.id === next.motherId)?.name : "";

  if (pd.loading) return <div className="mx-auto max-w-4xl space-y-4" aria-busy="true"><div className="h-14 w-2/3 animate-pulse rounded bg-surface-2" />{[0, 1, 2].map((i) => <div key={i} className="card h-28 animate-pulse bg-surface-2" />)}</div>;
  if (pd.error) return <div role="alert" className="card mx-auto max-w-xl text-warn">{tr("Could not load your patients. Please check your connection and try again.")}</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHead title={tr("Welcome, {name}", { name: auth.name })} sub="Here is who needs you today. Every view of a record is logged." tag="Sample profile" />

      <div className="grid grid-cols-3 gap-3">
        {[
          { n: rows.length, l: "Patients", i: Users, href: "/pro/patients", tone: "text-primary" },
          { n: urgentCount, l: "Need a call now", i: AlertOctagon, href: "/pro/alerts", tone: urgentCount ? "text-danger" : "text-ok" },
          { n: callbacks, l: "Open callbacks", i: Phone, href: "/pro/alerts", tone: callbacks ? "text-warn" : "text-ok" },
        ].map((x) => (
          <Link key={x.l} href={x.href} className="card flex items-center gap-3 !p-4">
            <x.i className={`h-6 w-6 shrink-0 ${x.tone}`} aria-hidden />
            <div><div className="font-serif text-3xl leading-none text-plum-800">{x.n}</div><div className="mt-1 text-xs font-semibold text-ink-muted">{tr(x.l)}</div></div>
          </Link>
        ))}
      </div>

      <section aria-labelledby="now-h" className="space-y-3">
        <h2 id="now-h" className="font-serif text-2xl">{tr("Needs you now")}</h2>
        {needing.length === 0 && <div className="card flex items-center gap-3 text-ink-muted"><CheckCircle2 className="h-6 w-6 text-ok" aria-hidden />{tr("Nobody needs a call right now. Everyone is looked after.")}</div>}
        <m.ul variants={stagger()} initial="hidden" animate="show" className="space-y-3">
          {needing.map((r) => {
            const u = urgency(r) as 0 | 1 | 2 | 3;
            const t = TONE[u];
            const reasons = reasonsOf(r);
            const urgentFlag = r.flags.some((f) => !f.resolved && URGENT.includes(f.kind));
            return (
              <m.li variants={rise} key={r.id} className={`card relative overflow-hidden !p-0 ${t.ring}`}>
                <span className={`absolute inset-y-0 left-0 w-1.5 ${t.bar}`} aria-hidden />
                <div className="flex flex-wrap items-center gap-4 p-4 pl-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2"><h3 className="font-serif text-xl">{tr(r.name)}</h3><span className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: r.day })}</span></div>
                    <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-bold ${t.text}`}>{urgentFlag && <AlertOctagon className="h-4 w-4" aria-hidden />}{tr(urgentFlag ? "Needs a call now" : t.label)}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {reasons.slice(0, 3).map((x) => <li key={x} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.soft} ${t.text}`}>{tr(x)}</li>)}
                      {reasons.length > 3 && <li className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-muted">{tr("+{n} more", { n: reasons.length - 3 })}</li>}
                    </ul>
                    {openCases(r.id).length > 0 && (
                      <ul className="mt-2 space-y-1" aria-label={tr("Open cases")}>
                        {openCases(r.id).slice(0, 3).map((c) => (
                          <li key={c.id} className="flex flex-wrap items-center gap-2"><PriorityChip priority={c.priority as Priority | null} /><Link href={`/pro/cases/${c.id}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{caseTitle(c.concern, s.lang)}</Link><span className="text-xs text-ink-muted">· {tr("{n} alerts", { n: (pd.sig.data?.find((p) => p.id === r.id)?.signals ?? []).filter((x) => x.caseId === c.id).length })}</span><DueCountdown dueBy={c.dueBy} priority={c.priority as Priority | null} /></li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CallButton phone={r.phone} small />
                    <Link href={`/pro/patients?p=${r.id}`} className="btn-ghost !py-2">{tr("Open patient")}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
                  </div>
                </div>
              </m.li>
            );
          })}
        </m.ul>
      </section>

      {calm.length > 0 && (
        <section aria-labelledby="calm-h" className="space-y-2">
          <h2 id="calm-h" className="font-serif text-2xl">{tr("Doing well")}</h2>
          <ul className="flex flex-wrap gap-2">
            {calm.map((r) => <li key={r.id}><Link href={`/pro/patients?p=${r.id}`} className="chip !min-h-0 gap-2 !py-2"><span className="h-2 w-2 rounded-full bg-ok" aria-hidden />{tr(r.name)}<span className="text-xs text-ink-muted">{tr("Day {n}", { n: r.day })}</span></Link></li>)}
          </ul>
        </section>
      )}

      {next && (
        <section aria-labelledby="next-h" className="space-y-2">
          <h2 id="next-h" className="font-serif text-2xl">{tr("Next session")}</h2>
          <div className="card flex flex-wrap items-center gap-3 !p-4">
            <CalendarClock className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1"><div className="font-bold">{tr(nextWho || "Patient")}</div><div className="text-sm text-ink-muted">{fmtTime(next.startsAt)}</div></div>
            <a href={canJoin(next.startsAt) ? roomUrl(next.room) : undefined} target="_blank" rel="noreferrer" aria-disabled={!canJoin(next.startsAt)} className={`btn-primary ${canJoin(next.startsAt) ? "" : "pointer-events-none opacity-50"}`}><Video className="h-4 w-4" aria-hidden />{tr("Join video call")}</a>
            <Link href="/pro/sessions" className="btn-ghost">{tr("All sessions")}</Link>
          </div>
        </section>
      )}
    </div>
  );
}
