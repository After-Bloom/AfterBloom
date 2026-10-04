"use client";
import { useState } from "react";
import { Download, MessageCircle } from "lucide-react";
import { useApp, daysSince, dayStr } from "@/lib/store";
import { weekData, stageText, face, familyNote } from "@/lib/report";
import { PageHead, Tabs, LevelBadge, Toggle, fmtDate, Disclaimer } from "@/components/ui";
import { TrendChart, BpChart } from "@/components/Charts";
import { PROS } from "@/lib/pros";
import { useTr } from "@/lib/i18n";

export default function Report() {
  const { s, set } = useApp();
  const tr = useTr();
  const [tab, setTab] = useState("mine");
  const w = weekData(s);
  const notable = s.symptomLogs.filter((l) => l.level !== "GREEN");
  const bps = s.checkins.filter((c) => c.bp);
  const shareText = tr("AfterBloom summary for {name} (day {n} postpartum)", { name: tr(s.mother.name), n: daysSince(s.mother.birth) }) + "\n" + tr("EPDS:") + " " + (s.epds.map((e) => `${fmtDate(e.date)}: ${e.total}`).join(", ") || tr("none yet")) + "\n" + tr("AMBER/RED symptoms:") + " " + notable.length + "\n" + tr("Check-ins in last 7 days:") + ` ${w.days}/7`;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title="Weekly report" sub="Every Sunday. The same data, written for three readers." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "mine", label: "Your week" }, { id: "doctor", label: "For your doctor" }, { id: "family", label: "For family" }]} />

      {tab === "mine" && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="text-xl font-bold">{tr("Your week 💜")}</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Mood", face(w.mood)], ["Appetite", face(w.appetite)], ["Sleep", face(w.sleep / 8 * 5)]].map(([k, f]) => <div key={k} className="rounded-xl bg-plum-50 p-3"><div className="text-3xl">{w.week.length ? f : "-"}</div><div className="text-xs text-plum-900/60">{tr(k)}</div></div>)}
            </div>
            <TrendChart data={w.week} height={170} />
            <p className="rounded-xl bg-emerald-50 p-3 text-emerald-900">{tr("You checked in on")} <b>{tr("{n} of 7", { n: w.days })}</b> {tr("days this week. Thank you for looking after yourself.")}</p>
          </div>
          <div className="card space-y-2">
            <h3 className="font-bold">{tr("Symptoms you reported")}</h3>
            {w.symptoms.length ? w.symptoms.map((l, i) => <div key={i} className="flex items-center justify-between text-sm"><span>{l.labels.map((x) => tr(x)).join(", ")}</span><LevelBadge level={l.level} /></div>) : <p className="text-sm text-plum-900/60">{tr("None this week.")}</p>}
            {w.watching && <p className="text-sm text-plum-800 font-medium">{tr("Your care team is keeping an eye on this.")}</p>}
          </div>
          <div className="card space-y-1 text-sm">
            <h3 className="font-bold text-base">{tr("Coming up")}</h3>
            <p>{tr("Baby's next vaccine:")} {w.nextVax ? tr("{a} ({n} days)", { a: tr(w.nextVax.age), n: w.dueIn ?? 0 }) : tr("all done for now")}</p>
            <p>{tr("Appointment:")} {w.booking ? `${tr(PROS.find((p) => p.id === w.booking!.proId)?.name ?? "")}, ${tr(w.booking.when)}` : tr("none booked")}</p>
          </div>
          <div className="card bg-plum-50"><b>{tr("This week's guidance")}</b><p className="mt-1">{tr(stageText(s.mother.birth))}</p></div>
          <p className="text-xs text-plum-900/60">{tr("No scores, no grades. Written from fixed templates, not AI.")}</p>
        </div>
      )}

      {tab === "doctor" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 no-print">
            <button className="btn-primary" onClick={() => window.print()}><Download className="h-4 w-4" />{tr("Download PDF")}</button>
            <a className="btn-soft" target="_blank" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}><MessageCircle className="h-4 w-4" />{tr("Share on WhatsApp")}</a>
          </div>
          <div className="card space-y-4 !p-6 bg-white">
            <div className="flex justify-between border-b border-plum-200 pb-2"><div><h2 className="text-xl font-bold">{tr("AfterBloom clinical summary")}</h2><div className="text-sm">{tr(s.mother.name)} · {tr("day {n} postpartum", { n: daysSince(s.mother.birth) })} · {tr(s.mother.delivery)}</div></div><div className="text-right text-sm">{tr("Generated")} {fmtDate(new Date().toISOString())}</div></div>
            <section><h3 className="font-bold mb-1">{tr("Check-in trends")}</h3><TrendChart data={s.checkins} height={170} /></section>
            <section><h3 className="font-bold mb-1">{tr("EPDS scores")}</h3>{s.epds.length ? s.epds.map((e) => <div key={e.date} className="text-sm">{fmtDate(e.date)}: <b>{e.total}/30</b> ({tr(e.band)}){e.selfHarm ? " - " + tr("Q10 positive") : ""}</div>) : <p className="text-sm text-gray-500">{tr("No screening completed yet.")}</p>}</section>
            <section><h3 className="font-bold mb-1">{tr("AMBER / RED symptoms")}</h3>{notable.length ? notable.map((l, i) => <div key={i} className="text-sm">{fmtDate(l.date)} · <b>{tr(l.level)}</b> · {l.labels.map((x) => tr(x)).join(", ")} · {tr("advised:")} {l.level === "RED" ? tr("emergency care") : tr("see doctor within 24 h")}</div>) : <p className="text-sm text-gray-500">{tr("None recorded.")}</p>}</section>
            {bps.length > 0 && <section><h3 className="font-bold mb-1">{tr("Blood pressure")}</h3><BpChart data={bps} /></section>}
            <section><h3 className="font-bold mb-1">{tr("Missed check-ins")}</h3><p className="text-sm">{tr("{a} of the last {b} days", { a: Math.max(0, Math.min(daysSince(s.mother.birth), 14) - new Set(s.checkins.filter((c) => daysSince(c.date) < 14).map((c) => dayStr(c.date))).size), b: Math.min(daysSince(s.mother.birth), 14) })}</p></section>
            <Disclaimer>Screening support, not a diagnosis. Generated by AfterBloom from patient-entered data.</Disclaimer>
          </div>
        </div>
      )}

      {tab === "family" && (
        <div className="space-y-3">
          <div className="card"><Toggle on={s.consent.familyNote} onChange={(v) => set((p) => ({ ...p, consent: { ...p.consent, familyNote: v } }))} label={'Send a weekly "How to help this week" note'} hint="Goes only to family you have allowed. No symptoms, scores or health details." /></div>
          <div className="card space-y-2"><h3 className="font-bold">{tr("Preview")}</h3><ul className="list-disc ml-5 space-y-1.5">{familyNote(s, tr).map((l) => <li key={l}>{l}</li>)}</ul></div>
        </div>
      )}
    </div>
  );
}
