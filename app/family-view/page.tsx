"use client";
import { useState } from "react";
import { BellRing } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHead, Tabs, fmtTime, Disclaimer } from "@/components/ui";
import { NightFeeds } from "@/components/NightFeeds";
import { PARTNER_QS } from "@/lib/epds";
import { familyNote } from "@/lib/report";
import { PSYCHOSIS_SIGNS } from "@/lib/symptoms";
import Link from "next/link";
import { useTr } from "@/lib/i18n";

const MODULES = [
  { id: "ppd", title: "What postpartum depression actually is (2 min)", body: [
    "Postpartum depression (PPD) is a medical condition, not weakness and not a lack of gratitude. About 1 in 5 Indian mothers has it.",
    "It can show up as constant sadness, crying, not sleeping even when the baby sleeps, not eating, feeling like a bad mother, or not feeling close to the baby.",
    "It is very treatable, especially when the family supports her. Saying 'you have a healthy baby, why are you sad?' makes it worse.",
  ] },
  { id: "normal", title: "What is normal after birth", body: [
    "Bleeding for up to 6 weeks that slowly gets lighter, cramps in the first week, tiredness, and tearfulness in the first two weeks (baby blues) are normal.",
    "Baby blues should fade within about 2 weeks. If sadness stays or gets worse, it may be more than the blues.",
  ] },
  { id: "warn", title: "Warning signs to watch for", body: [
    "Go to hospital now: heavy bleeding, fits, severe headache with blurred vision, chest pain, fever with chills or foul-smelling discharge, a painful swollen calf, or any thought of harming herself or the baby.",
    "Call emergency services at once if she is confused, sees or hears things others do not, believes the baby is in danger or not hers, or has not slept for days.",
  ] },
  { id: "help", title: "How to help without taking over", body: [
    "Ask what would help, then do it. Take night feeds so she can sleep a full 4 to 5 hours in a row.",
    "Do not give advice or compare. Listen. Say: 'I am here. You are doing well.'",
    "Protect her from visitors and comments. Handle food, water and housework without being asked.",
    "Encourage her to talk to a counsellor. It is a sign of strength.",
  ] },
];

export default function FamilyView() {
  const { s, set, openCrisis } = useApp();
  const tr = useTr();
  const [tab, setTab] = useState("learn");
  const [open, setOpen] = useState<string | null>("ppd");
  const [yes, setYes] = useState<boolean[]>(PARTNER_QS.map(() => false));
  const [sent, setSent] = useState(false);
  const me = s.family[0]?.name ?? "Rohan";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title={tr("Supporting {name}", { name: tr(s.mother.name) })} sub={tr("Hello {me}. Here is how to help {name} and {baby}.", { me: tr(me), name: tr(s.mother.name), baby: tr(s.mother.babyName) })} tag="Family" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "learn", label: "Learn" }, { id: "screen", label: "What I noticed" }, { id: "feeds", label: "Night feeds" }, { id: "alerts", label: s.alerts.length ? tr("Alerts ({n})", { n: s.alerts.length }) : "Alerts" }, { id: "note", label: "How to help" }]} />

      {tab === "learn" && (
        <div className="space-y-3">
          {MODULES.map((m) => (
            <div key={m.id} className="card">
              <button className="w-full text-left font-bold font-serif text-lg" onClick={() => setOpen(open === m.id ? null : m.id)}>{tr(m.title)}</button>
              {open === m.id && <div className="mt-3 space-y-2">{m.body.map((b, i) => <p key={i}>{tr(b)}</p>)}</div>}
            </div>
          ))}
          <div className="card border-red-200 bg-red-50">
            <b>{tr("Emergency signs (postpartum psychosis):")}</b>
            <ul className="list-disc ml-5 mt-1 text-sm">{PSYCHOSIS_SIGNS.map((x) => <li key={x}>{tr(x)}</li>)}</ul>
            <button className="btn bg-red-600 text-white mt-3" onClick={() => openCrisis({ kind: "psychosis", reason: "Family reported warning signs" })}>{tr("I see these signs")}</button>
          </div>
        </div>
      )}

      {tab === "screen" && (
        <div className="card space-y-3">
          <p className="text-sm text-plum-900/70">{tr("Mothers often under-report. In the last 2 weeks, have you noticed:")}</p>
          {PARTNER_QS.map((q, i) => (
            <label key={q} className="flex items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5 accent-plum-700" checked={yes[i]} onChange={() => setYes(yes.map((v, j) => (j === i ? !v : v)))} /><span>{tr(q)}</span></label>
          ))}
          <button className="btn-primary w-full" onClick={() => { set((p) => ({ ...p, partnerScreens: [{ date: new Date().toISOString(), yes: yes.filter(Boolean).length }, ...p.partnerScreens] })); setSent(true); }}>{tr("Share with her care team")}</button>
          {sent && <p className="text-sm text-emerald-800">{tr("Thank you.")} {yes.filter(Boolean).length >= 3 ? tr("Her care team will be told.") + " " : ""}{tr("Gentle next step: tell her you are there, and offer to sit with her while she talks to someone.")}</p>}
        </div>
      )}

      {tab === "feeds" && <div className="card"><NightFeeds me={me} /></div>}

      {tab === "alerts" && (
        <div className="space-y-3">
          {s.alerts.length === 0 && <div className="card text-plum-900/70">{tr("No alerts. You only see what {name} has agreed to share.", { name: tr(s.mother.name) })}</div>}
          {s.alerts.map((a) => <div key={a.id} className="card border-red-200 bg-red-50"><div className="flex items-center gap-2 font-semibold text-red-800"><BellRing className="h-4 w-4" />{tr("Safety alert")} · {fmtTime(a.at)}</div><p>{tr(a.text)}</p><a href="tel:112" className="btn bg-red-600 text-white mt-2">{tr("Call 112")}</a></div>)}
        </div>
      )}

      {tab === "note" && (
        <div className="card space-y-3">
          <h3 className="font-bold">{tr("How to help this week")}</h3>
          {!s.consent.familyNote && <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">{tr("{name} has not turned this note on. This is a preview of what it would look like; it never contains scores or health details.", { name: tr(s.mother.name) })}</p>}
          <ul className="list-disc ml-5 space-y-1.5">{familyNote(s, tr).map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
      <Link href="/baby" className="btn-soft w-full">{tr("See {baby}'s vaccine schedule", { baby: tr(s.mother.babyName) })}</Link>
      <Disclaimer />
    </div>
  );
}
