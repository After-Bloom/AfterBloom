"use client";
import Link from "next/link";
import { useState } from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { BellRing, ChevronDown, Loader2, Syringe } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { useFamilyView } from "@/lib/data/family";
import { MODULES } from "@/lib/education";
import { PARTNER_QS } from "@/lib/epds";
import { PSYCHOSIS_SIGNS } from "@/lib/symptoms";
import { PageHead, Tabs, fmtTime, Disclaimer } from "@/components/ui";
import { NightPlanner } from "@/components/NightPlanner";
import { useTr } from "@/lib/i18n";
import { rise, stagger } from "@/lib/motion";

export default function FamilyView() {
  const { s, openCrisis } = useApp();
  const act = useActions();
  const tr = useTr();
  const fv = useFamilyView();
  const [tab, setTab] = useState("learn");
  const [open, setOpen] = useState<string | null>("ppd");
  const [yes, setYes] = useState<boolean[]>(PARTNER_QS.map(() => false));
  const [sent, setSent] = useState<null | { told: boolean }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (fv.loading) return <div className="mx-auto max-w-4xl space-y-4" aria-busy="true"><div className="h-12 w-2/3 animate-pulse rounded bg-surface-2" />{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse bg-surface-2" />)}</div>;
  if (fv.error) return <div role="alert" className="card mx-auto max-w-xl text-warn">{tr("Could not load. Please check your connection and try again.")}</div>;
  if (!fv.link) return (
    <div className="mx-auto max-w-xl space-y-4"><PageHead title="Family home" /><div className="card space-y-2"><p>{tr("You are not linked to a mother yet, or she has removed the link.")}</p><p className="text-sm text-ink-muted">{tr("Ask her for a new invite code from her Family circle, then sign up again as a family member.")}</p></div></div>
  );
  const l = fv.link;
  const mom = l.motherName.split(" ")[0];
  const low = fv.lowSleepNights ?? 0;
  const note = [
    ...(low >= 2 ? [tr("She slept under 5 hours on {n} nights this week. Can someone take a night feed?", { n: low })] : []),
    tr("Ask her what would help most today, then do it without being asked twice."),
    tr("Cook a meal or fill her water bottle - small things lift a very big load."),
    tr("Listen without fixing. 'That sounds hard' is a good sentence."),
  ];

  const submit = async () => {
    setBusy(true); setErr("");
    const res = await fetch("/api/partner-screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: yes }) });
    setBusy(false);
    if (!res.ok) return setErr(tr("Could not send. Please try again."));
    const j = await res.json(); setSent({ told: !!j.careTeamTold });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title={tr("Supporting {name}", { name: mom })} sub={tr("Hello {me}. Here is how to help {name} and {baby}.", { me: l.myName, name: mom, baby: l.babyName || tr("the baby") })} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "learn", label: "Learn" }, { id: "screen", label: "What I noticed" }, { id: "feeds", label: "Night feeds" }, { id: "alerts", label: s.alerts.length ? tr("Alerts ({n})", { n: s.alerts.filter((a) => !a.read).length }) : "Alerts" }, { id: "note", label: "This week" }]} />

      {tab === "learn" && (
        <m.div variants={stagger()} initial="hidden" animate="show" className="space-y-3">
          {MODULES.map((mod) => (
            <m.section variants={rise} key={mod.id} className="card !p-0">
              <button className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 text-left font-serif text-lg font-semibold text-plum-800" onClick={() => setOpen(open === mod.id ? null : mod.id)} aria-expanded={open === mod.id}>{tr(mod.title)}<ChevronDown className={`h-5 w-5 shrink-0 transition ${open === mod.id ? "rotate-180" : ""}`} aria-hidden /></button>
              <AnimatePresence initial={false}>
                {open === mod.id && <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="space-y-2 px-5 pb-5 text-base">{mod.body.map((b, i) => <p key={i}>{tr(b)}</p>)}</div></m.div>}
              </AnimatePresence>
            </m.section>
          ))}
          <div className="card !border-danger/40 bg-danger/10">
            <b className="text-danger">{tr("Emergency signs (postpartum psychosis):")}</b>
            <ul className="ml-5 mt-1 list-disc text-sm">{PSYCHOSIS_SIGNS.map((x) => <li key={x}>{tr(x)}</li>)}</ul>
            <button className="btn mt-3 bg-danger text-white dark:text-[#1C1117]" onClick={() => openCrisis({ kind: "psychosis", reason: "Family reported warning signs" })}>{tr("I see these signs")}</button>
          </div>
          <Link href="/baby" className="card flex items-center gap-3 !p-4 font-semibold text-plum-800"><Syringe className="h-5 w-5 text-primary" aria-hidden />{tr("See {baby}'s vaccine timeline", { baby: l.babyName || tr("the baby") })}</Link>
        </m.div>
      )}

      {tab === "screen" && (
        <section className="card space-y-3">
          <p className="text-sm text-ink-muted">{tr("Mothers often under-report. In the last 2 weeks, have you noticed:")}</p>
          {PARTNER_QS.map((q, i) => (
            <label key={q} className="flex min-h-[44px] items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5 accent-[rgb(var(--primary-fill))]" checked={yes[i]} onChange={() => setYes(yes.map((v, j) => (j === i ? !v : v)))} /><span>{tr(q)}</span></label>
          ))}
          <button className="btn-primary w-full" onClick={submit} disabled={busy || !!sent}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{tr("Send")}</button>
          {err && <p role="alert" className="text-sm font-semibold text-danger">{err}</p>}
          {sent && <p role="status" className="text-sm text-ok">{tr("Thank you.")} {sent.told ? tr("Her care team will be told.") + " " : ""}{tr("Gentle next step: tell her you are there, and offer to go with her to a counsellor.")}</p>}
        </section>
      )}

      {tab === "feeds" && <section className="card"><NightPlanner shifts={fv.shifts} me={l.myName.split(" ")[0]} owner={l.motherName} onToggle={(d, sl, who) => fv.toggleShift(d, sl, who)} /></section>}

      {tab === "alerts" && (
        <div className="space-y-3">
          {s.alerts.length === 0 && <div className="card text-ink-muted">{tr("No alerts. You only see what {name} has agreed to share.", { name: mom })}</div>}
          {s.alerts.map((a) => (
            <button key={a.id} onClick={() => act.markAlertRead(a.id)} className={`card w-full text-left ${a.kind === "emergency" && !a.read ? "!border-danger/50 bg-danger/10" : ""}`}>
              <div className="flex items-center gap-2 font-semibold"><BellRing className="h-4 w-4 text-danger" aria-hidden />{a.title}</div>
              <div>{a.body}</div><div className="mt-1 text-xs text-ink-muted">{fmtTime(a.at)}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "note" && (
        <section className="card space-y-3">
          <h2 className="font-serif text-xl">{tr("How to help this week")}</h2>
          {!l.noteOn && <p className="rounded-control border border-warn/40 bg-warn/10 p-3 text-sm">{tr("{name} has not turned this note on. This is a preview of what it would look like; it never contains symptoms, scores or health details.", { name: mom })}</p>}
          <ul className="ml-5 list-disc space-y-1.5">{note.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      )}
      <Disclaimer />
    </div>
  );
}
