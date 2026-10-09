"use client";
import { useMemo, useState } from "react";
import { Check, Download, Loader2, MessageCircle, Send } from "lucide-react";
import { useApp, daysSince, dayStr } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { weekData, stageText, face, recoveryWeeks } from "@/lib/report";
import { RISK_ITEMS, riskKeys } from "@/lib/risk";
import { PageHead, Tabs, LevelBadge, Toggle, fmtDate, fmtTime, Disclaimer } from "@/components/ui";
import { TrendChart, BpChart } from "@/components/Charts";
import { BloomProgress } from "@/components/BloomProgress";
import { useTr } from "@/lib/i18n";
import { loc } from "@/lib/locale";
import { EPDS_SCHEDULE } from "@/lib/epds";
import { VACCINES } from "@/lib/vaccines";

const ADVICE: Record<string, string> = { RED: "Go to hospital now", AMBER: "See a doctor within 24 hours", GREEN: "Normal recovery" };

export default function Report() {
  const { s } = useApp();
  const act = useActions();
  const tr = useTr();
  const [tab, setTab] = useState("week");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState("");
  const w = weekData(s);
  const age = daysSince(s.mother.birth);
  const nextEpds = EPDS_SCHEDULE.find((e) => e.day >= age);
  const vax = VACCINES.find((v) => v.days >= age && !s.vaccinesDone.includes(v.id));

  // last 14 days: which days she checked in (never a score, never a grade)
  const fourteen = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return { key: dayStr(d), label: d.toLocaleDateString(loc.v, { day: "numeric", month: "short" }), valid: d.getTime() >= new Date(s.mother.birth).getTime() - 86400000 };
  }), [s.mother.birth]);
  const checked = new Set(s.checkins.map((c) => dayStr(c.date)));
  const missed = fourteen.filter((d) => d.valid && !checked.has(d.key));
  const twoWeeks = s.checkins.filter((c) => daysSince(c.date) < 14);
  const flagged = s.symptomLogs.filter((l) => l.level !== "GREEN" && daysSince(l.date) < 21);
  const bps = s.checkins.filter((c) => c.bp && daysSince(c.date) < 21);
  const avgSleep = twoWeeks.length ? (twoWeeks.reduce((a, c) => a + c.sleepHours, 0) / twoWeeks.length).toFixed(1) : "-";

  const whatsapp = () => {
    const lines = [
      `AfterBloom - ${s.mother.name}, ${tr("day {n} after birth", { n: age })}`,
      `${tr("Check-ins in the last 14 days")}: ${twoWeeks.length}/14 · ${tr("Average sleep")}: ${avgSleep} h`,
      ...(flagged.length ? [`${tr("Symptoms")}: ` + flagged.map((l) => `${fmtDate(l.date)} ${l.level} ${l.labels.join(", ")}`).join("; ")] : []),
      ...(s.epds.length ? [`EPDS: ` + s.epds.slice(0, 3).map((e) => `${fmtDate(e.date)} ${e.total}/30`).join("; ")] : []),
      ...(bps.length ? [`BP: ` + bps.map((c) => `${fmtDate(c.date)} ${c.bp!.sys}/${c.bp!.dia}`).join("; ")] : []),
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  const sendFamily = async () => {
    setSending(true); setSent(null);
    const res = await fetch("/api/family/send-note", { method: "POST" });
    setSending(false);
    const j = await res.json().catch(() => ({}));
    setSent(res.ok ? tr("Sent to {n} family members.", { n: j.sent ?? 0 }) : tr("Could not send. Please try again."));
  };

  // A real, selectable PDF, built on the phone from the same data on screen and downloaded directly - not a
  // system print dialog, whose "Save as PDF" is unreliable from a PWA's standalone window on some phones.
  const downloadPdf = async () => {
    setPdfBusy(true); setPdfErr("");
    try {
      const { buildReportPdf } = await import("@/lib/reportPdf");
      const lastWeight = s.weights.filter((w) => w.kg > 0).slice(-1)[0];
      const bytes = await buildReportPdf({
        motherName: s.mother.name, day: age, delivery: s.mother.delivery,
        dateLabel: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        riskLine: !s.risk.set ? "Not filled in yet." : riskKeys(s.risk).length ? riskKeys(s.risk).map((k) => RISK_ITEMS.find((x) => x.k === k)!.label).join("; ") : "No extra risks reported.",
        babyWeightLine: s.mother.birthWeightKg ? `Baby: birth weight ${s.mother.birthWeightKg} kg${lastWeight ? `; last weight ${lastWeight.kg} kg (${fmtDate(lastWeight.date)})` : ""}` : null,
        checkedDays: twoWeeks.length, totalDays: 14, avgSleep,
        epds: s.epds.map((e) => ({ dateLabel: fmtDate(e.date), total: e.total, band: e.band, selfHarm: e.selfHarm })),
        symptoms: flagged.map((l) => ({ dateLabel: fmtDate(l.date), level: l.level as "RED" | "AMBER", labels: l.labels.join(", "), advice: ADVICE[l.level] })),
        bp: bps.map((c) => ({ dateLabel: fmtDate(c.date), sys: c.bp!.sys, dia: c.bp!.dia })),
        missed: missed.map((d) => d.label),
      });
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = `afterbloom-report-${dayStr(new Date())}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch { setPdfErr(tr("Could not build the PDF. Please try again.")); }
    setPdfBusy(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHead title="Your weekly report" sub="Three versions of the same week, for three readers. Written from fixed templates, never by AI." />
      <div className="no-print"><Tabs value={tab} onChange={setTab} tabs={[{ id: "week", label: "Your week" }, { id: "recovery", label: "Recovery" }, { id: "doctor", label: "For my doctor" }, { id: "family", label: "For my family" }]} /></div>

      {tab === "week" && (
        <div className="space-y-4">
          <section className="card flex flex-wrap items-center gap-4">
            <BloomProgress value={w.days / 7} className="w-20 shrink-0" label={tr("Your bloom: {n} of 7 days", { n: w.days })} />
            <div className="min-w-0 flex-1"><h2 className="font-serif text-2xl">{tr("Your week")}</h2><p className="text-ink-muted">{tr("You checked in on {n} of 7 days this week.", { n: w.days })}</p></div>
          </section>
          <section className="card"><h3 className="mb-2 font-bold">{tr("How you felt")}</h3>
            <div className="grid grid-cols-3 gap-3 text-center">{[{ l: "Mood", f: face(w.mood) }, { l: "Appetite", f: face(w.appetite) }, { l: "Sleep", f: w.sleep >= 6 ? "😴" : w.sleep >= 4.5 ? "🥱" : "😵" }].map((x) => <div key={x.l} className="rounded-control bg-surface-2 p-3"><div className="text-3xl" aria-hidden>{x.f}</div><div className="text-sm font-semibold text-ink-muted">{tr(x.l)}</div></div>)}</div>
            <div className="mt-4"><TrendChart data={w.week} height={180} /></div>
          </section>
          {w.symptoms.length > 0 && <section className="card"><h3 className="mb-2 font-bold">{tr("Symptoms you reported")}</h3>{w.symptoms.map((l, i) => <div key={i} className="flex flex-wrap items-center gap-2 border-b border-line py-2 text-sm last:border-0"><LevelBadge level={l.level} /><span>{l.labels.map((x) => tr(x)).join(", ")}</span><span className="text-ink-muted">· {tr(ADVICE[l.level])}</span></div>)}</section>}
          <section className="card"><h3 className="mb-2 font-bold">{tr("Coming up")}</h3>
            <ul className="space-y-1.5 text-sm">
              {nextEpds && <li>🧠 {tr("Mind check")}: {tr(nextEpds.label)}</li>}
              {vax && <li>💉 {tr("Baby: {a} vaccines ({n})", { a: tr(vax.age), n: vax.vaccines.length })}</li>}
              {w.booking && <li>📅 {tr("Session with {n}", { n: tr(w.booking.proName) })}: {fmtTime(w.booking.when)}</li>}
            </ul>
          </section>
          <section className="card bg-plum-100"><p className="font-serif text-xl">{tr(stageText(s.mother.birth))}</p></section>
          {w.watching && <p className="card text-center font-semibold text-plum-800">{tr("Your care team is keeping an eye on this.")}</p>}
        </div>
      )}

      {tab === "recovery" && (
        <div className="space-y-4">
          <section className="card space-y-1"><h2 className="font-serif text-2xl">{tr("Your first six weeks")}</h2><p className="text-sm text-ink-muted">{tr("One row for each week since the birth. It shows how often you checked in and how you were, never a grade.")}</p></section>
          <div className="space-y-3">
            {recoveryWeeks(s).map((r) => (
              <section key={r.week} className={`card space-y-2 ${r.current ? "!border-primary" : ""}`}>
                <div className="flex items-center justify-between gap-2"><h3 className="font-serif text-xl">{tr("Week {n}", { n: r.week })}{r.current && <span className="ml-2 rounded-full bg-plum-100 px-2 py-0.5 align-middle text-xs font-bold text-plum-800">{tr("This week")}</span>}</h3><span className="text-sm font-semibold text-ink-muted">{tr("Checked in {n} of 7 days", { n: r.days })}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden><div className="h-full rounded-full bg-primary-fill" style={{ width: `${(r.days / 7) * 100}%` }} /></div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-control bg-surface-2 p-2"><div className="text-2xl" aria-hidden>{r.mood ? face(r.mood) : "–"}</div><div className="text-xs font-semibold text-ink-muted">{tr("Mood")}</div></div>
                  <div className="rounded-control bg-surface-2 p-2"><div className="text-xl font-bold">{r.sleep ? r.sleep.toFixed(1) : "–"}</div><div className="text-xs font-semibold text-ink-muted">{tr("Sleep (h)")}</div></div>
                  <div className="rounded-control bg-surface-2 p-2"><div className="text-xl font-bold">{r.maxBp ? `${r.maxBp.sys}/${r.maxBp.dia}` : "–"}</div><div className="text-xs font-semibold text-ink-muted">{tr("Highest BP")}</div></div>
                </div>
                {(r.amber > 0 || r.red > 0) && <p className="text-sm text-ink-muted">{r.red > 0 && <span className="font-semibold text-danger">{tr("{n} urgent signs", { n: r.red })}</span>}{r.red > 0 && r.amber > 0 && " · "}{r.amber > 0 && <span className="font-semibold text-warn">{tr("{n} to watch", { n: r.amber })}</span>}</p>}
              </section>
            ))}
          </div>
        </div>
      )}

      {tab === "doctor" && (
        <div className="space-y-4">
          <div className="no-print card flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}{tr("Download as PDF")}</button>
            <button className="btn-soft" onClick={whatsapp}><MessageCircle className="h-4 w-4" aria-hidden />{tr("Share on WhatsApp")}</button>
            <div className="min-w-[14rem] flex-1"><Toggle on={s.consent.shareWithPro} onChange={(v) => act.setConsent({ shareWithPro: v })} label="My AfterBloom professional sees this automatically" /></div>
            {pdfErr && <p role="alert" className="w-full text-sm font-semibold text-danger">{pdfErr}</p>}
          </div>
          <article className="card space-y-4 print:border-0 print:p-0 print:shadow-none" aria-label={tr("One-page clinical summary")}>
            <header className="border-b border-line pb-3">
              <h2 className="font-serif text-2xl">{tr("Clinical summary")}: {s.mother.name}</h2>
              <p className="text-sm text-ink-muted">{tr("Day {n} after birth", { n: age })} · {tr(s.mother.delivery)} · {tr("Baby")}: {s.mother.babyName || "-"} · {new Date().toLocaleDateString(loc.v, { day: "numeric", month: "long", year: "numeric" })}</p>
            </header>
            <section><h3 className="mb-1 font-bold">{tr("Recovery profile")}</h3><p className="text-sm">{!s.risk.set ? tr("Not filled in yet.") : riskKeys(s.risk).length ? riskKeys(s.risk).map((k) => tr(RISK_ITEMS.find((x) => x.k === k)!.label)).join("; ") : tr("No extra risks reported.")}</p>{s.mother.birthWeightKg && <p className="text-sm">{tr("Baby")}: {tr("birth weight")} {s.mother.birthWeightKg} kg{s.weights.filter((w) => w.kg > 0).length ? `; ${tr("last weight")} ${s.weights.filter((w) => w.kg > 0).slice(-1)[0].kg} kg (${fmtDate(s.weights.filter((w) => w.kg > 0).slice(-1)[0].date)})` : ""}</p>}</section>
            <section><h3 className="mb-1 font-bold">{tr("Check-in trends (last 14 days)")}</h3><TrendChart data={twoWeeks} height={170} /><p className="text-sm text-ink-muted">{tr("Checked in {n} of 14 days. Average sleep {h} h.", { n: twoWeeks.length, h: avgSleep })}</p></section>
            <section><h3 className="mb-1 font-bold">{tr("Mood screening (EPDS)")}</h3>
              {s.epds.length === 0 && <p className="text-sm text-ink-muted">{tr("No screening yet.")}</p>}
              {s.epds.map((e, i) => (
                <div key={i} className="flex justify-between border-b border-line py-1 text-sm last:border-0">
                  <span>{fmtDate(e.date)}</span>
                  {/* on screen she is never shown a frightening number alone; the downloaded PDF carries the score for her doctor */}
                  <span><span className="screen-only">{e.band === "low" ? tr("Doing well") : tr("Score shared with your care team")}</span><span className="print-only"><b>{e.total}/30</b>{e.selfHarm ? " · Q10+" : ""}</span></span>
                </div>
              ))}
            </section>
            <section><h3 className="mb-1 font-bold">{tr("AMBER and RED symptoms")}</h3>
              {flagged.length === 0 && <p className="text-sm text-ink-muted">{tr("None.")}</p>}
              {flagged.map((l, i) => <div key={i} className="flex flex-wrap gap-2 border-b border-line py-1 text-sm last:border-0"><span>{fmtDate(l.date)}</span><LevelBadge level={l.level} /><span>{l.labels.map((x) => tr(x)).join(", ")}</span><span className="text-ink-muted">· {tr("Advised")}: {tr(ADVICE[l.level])}</span></div>)}
            </section>
            {bps.length > 0 && <section><h3 className="mb-1 font-bold">{tr("Blood pressure")}</h3><BpChart data={bps} /></section>}
            <section><h3 className="mb-1 font-bold">{tr("Missed check-ins")}</h3><p className="text-sm">{missed.length ? missed.map((d) => d.label).join(", ") : tr("None in the last 14 days.")}</p></section>
            <footer className="border-t border-line pt-2 text-xs text-ink-muted">{tr("Generated by AfterBloom from the mother's own entries. Screening support and care navigation, not a diagnosis.")}</footer>
          </article>
        </div>
      )}

      {tab === "family" && (
        <div className="space-y-4">
          <section className="card space-y-3">
            <h2 className="font-serif text-2xl">{tr("How to help this week")}</h2>
            <p className="text-sm text-ink-muted">{tr("This note contains no symptoms, scores or health details. It only gives practical prompts. You decide whether it is sent at all, and to whom.")}</p>
            <ul className="ml-5 list-disc space-y-1.5">
              {w.lowSleepNights >= 2 && <li>{tr("She slept under 5 hours on {n} nights this week. Can someone take a night feed?", { n: w.lowSleepNights })}</li>}
              <li>{tr("Ask her what would help most today, then do it without being asked twice.")}</li>
              <li>{tr("Cook a meal or fill her water bottle - small things lift a very big load.")}</li>
              <li>{tr("Listen without fixing. 'That sounds hard' is a good sentence.")}</li>
            </ul>
          </section>
          <section className="card space-y-3">
            <Toggle on={s.consent.familyNote} onChange={(v) => act.setConsent({ familyNote: v })} label={'Send this note to my family every Sunday'} hint={tr("Goes to: {names}", { names: s.family.filter((f) => f.status === "active" && f.sees.weekly).map((f) => f.name).join(", ") || tr("nobody yet") })} />
            <button className="btn-soft" onClick={sendFamily} disabled={sending || !s.consent.familyNote}>{sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}{tr("Send it now")}</button>
            {sent && <p role="status" className="flex items-center gap-1 text-sm font-semibold text-ok"><Check className="h-4 w-4" aria-hidden />{sent}</p>}
          </section>
        </div>
      )}
      <div className="no-print"><Disclaimer /></div>
    </div>
  );
}
