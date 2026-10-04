"use client";
import { useEffect, useState } from "react";
import { AlertOctagon, Phone, Clock } from "lucide-react";
import { useApp, daysSince } from "@/lib/store";
import { SAMPLE_PATIENTS } from "@/lib/pros";
import { PageHead, Tabs, fmtTime, fmtDate } from "@/components/ui";
import { TrendChart } from "@/components/Charts";
import { useTr } from "@/lib/i18n";

type Row = { id: string; name: string; day: number; urgency: number; tags: string[]; epds: { d: string; score: number }[]; live?: boolean };

export default function Pro() {
  const { s, set, audit } = useApp();
  const tr = useTr();
  const [tab, setTab] = useState("patients");
  const [sel, setSel] = useState<string | null>(null);
  const open = s.flags.filter((f) => !f.resolved);
  const urgentLive = open.some((f) => f.kind === "q10" || f.kind === "red" || f.kind === "selfharm");

  const rows: Row[] = [
    {
      id: "live", name: `${s.mother.name} Verma`, day: daysSince(s.mother.birth), live: true,
      urgency: urgentLive ? 3 : open.length ? 2 : 0,
      tags: [...(urgentLive ? ["URGENT FLAG"] : []), ...open.filter((f) => f.kind === "epds").map(() => "Probable depression")],
      epds: s.epds.slice().reverse().map((e) => ({ d: fmtDate(e.date), score: e.total })),
    },
    ...SAMPLE_PATIENTS.map((p) => ({ id: p.id, name: p.name, day: p.day, urgency: p.tags.some((t) => t.includes("Probable")) ? 2 : p.tags.length ? 1 : 0, tags: p.tags, epds: p.epds.map((e) => ({ d: e.d, score: e.score })) })),
  ].sort((a, b) => b.urgency - a.urgency);

  const selected = rows.find((r) => r.id === sel);
  useEffect(() => {
    if (selected) audit("Dr. Ananya Rao (sample)", `Viewed record of ${selected.name}`);
  }, [sel]); // eslint-disable-line

  const chart = (r: Row) => {
    if (r.live) return s.checkins;
    const p = SAMPLE_PATIENTS.find((x) => x.id === r.id)!;
    return p.mood.map((m, i) => ({ date: new Date(Date.now() - (p.mood.length - i) * 86400000).toISOString(), mood: m, appetite: m, sleepHours: p.sleep[i] }));
  };

  return (
    <div className="max-w-6xl space-y-4">
      <PageHead title={tr("Dr. Ananya Rao's dashboard")} sub="Sorted by urgency. Every view of a record is logged." tag="Sample professional" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "patients", label: "Patients" }, { id: "callbacks", label: tr("Callbacks ({n})", { n: open.length }) }, { id: "mod", label: tr("Moderation ({n})", { n: s.mod.filter((m) => !m.done).length }) }, { id: "audit", label: "Audit log" }]} />

      {tab === "patients" && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2">
            {rows.map((r) => (
              <button key={r.id} onClick={() => setSel(r.id)} className={`card w-full text-left !p-4 ${sel === r.id ? "border-plum-600" : ""} ${r.urgency === 3 ? "!border-red-400 bg-red-50" : ""}`}>
                <div className="flex items-center justify-between"><b>{tr(r.name)}</b>{r.urgency === 3 && <AlertOctagon className="h-5 w-5 text-red-600" />}</div>
                <div className="text-sm text-plum-900/60">{tr("Day {n} postpartum", { n: r.day })}</div>
                <div className="mt-1 flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t === "URGENT FLAG" ? "bg-red-600 text-white" : "bg-amber-100 text-amber-900"}`}>{tr(t)}</span>)}{!r.tags.length && <span className="text-xs text-emerald-700">{tr("No flags")}</span>}</div>
              </button>
            ))}
          </div>
          <div className="md:col-span-3">
            {selected ? (
              <div className="card space-y-4">
                <h3 className="text-lg font-bold">{tr(selected.name)}</h3>
                <section><h4 className="font-semibold mb-1">{tr("EPDS bands and history")}</h4>{selected.epds.length ? selected.epds.map((e, i) => <div key={i} className="flex justify-between text-sm border-b border-plum-100 py-1"><span>{tr(e.d)}</span><b>{e.score}/30 · {e.score >= 13 ? tr("Probable") : e.score >= 10 ? tr("Possible") : tr("Low")}</b></div>) : <p className="text-sm text-gray-500">{tr("No screening yet.")}</p>}</section>
                <section><h4 className="font-semibold mb-1">{tr("Mood, sleep, appetite")}</h4><TrendChart data={chart(selected)} height={190} /></section>
                {selected.live && <section><h4 className="font-semibold mb-1">{tr("AMBER/RED symptoms")}</h4>{s.symptomLogs.filter((l) => l.level !== "GREEN").map((l, i) => <div key={i} className="text-sm">{fmtDate(l.date)} · {tr(l.level)} · {l.labels.map((x) => tr(x)).join(", ")}</div>)}{!s.symptomLogs.some((l) => l.level !== "GREEN") && <p className="text-sm text-gray-500">{tr("None.")}</p>}</section>}
              </div>
            ) : <div className="card text-plum-900/60">{tr("Select a patient to see their record.")}</div>}
          </div>
        </div>
      )}

      {tab === "callbacks" && (
        <div className="space-y-3">
          {open.length === 0 && <div className="card text-plum-900/60">{tr("No pending callbacks. Try an EPDS score of 13+ or question 10 as Priya.")}</div>}
          {open.map((f) => {
            const urgent = f.kind !== "epds";
            return (
              <div key={f.id} className={`card ${urgent ? "border-red-400 bg-red-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><div className={`font-bold ${urgent ? "text-red-700" : ""}`}>{urgent ? tr("URGENT: immediate callback") : tr("Callback within 24-48 h")} · {tr(s.mother.name + " Verma")}</div><div className="text-sm">{tr(f.text)}</div><div className="mt-1 flex items-center gap-1 text-xs text-plum-900/60"><Clock className="h-3.5 w-3.5" />{tr("Flagged")} {fmtTime(f.date)}{!urgent && ` · ${tr("due by")} ${fmtTime(f.dueAt)}`}</div></div>
                  <div className="flex flex-col gap-2"><a href="tel:+910000000000" className="btn-primary !py-2"><Phone className="h-4 w-4" />{tr("Call")}</a><button className="btn-ghost !py-2" onClick={() => { set((p) => ({ ...p, flags: p.flags.map((x) => (x.id === f.id ? { ...x, resolved: true } : x)) })); audit("Dr. Ananya Rao (sample)", `Completed callback: ${f.text}`); }}>{tr("Mark done")}</button></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "mod" && (
        <div className="space-y-3">
          <p className="text-sm text-plum-900/70">{tr("Messages flagged for self-harm language in Bloom Circles. The software never replies on its own; a human decides.")}</p>
          {s.mod.filter((m) => !m.done).length === 0 && <div className="card text-plum-900/60">{tr("Queue is empty. Post self-harm language in the Circle to test.")}</div>}
          {s.mod.filter((m) => !m.done).map((m) => (
            <div key={m.id} className="card border-red-300">
              <div className="text-xs text-red-700 font-semibold">{tr(m.reason)} · {fmtTime(m.at)}</div>
              <p className="my-2">"{m.text}"</p>
              <div className="flex gap-2">
                <button className="btn-primary !py-2" onClick={() => set((p) => ({ ...p, mod: p.mod.map((x) => (x.id === m.id ? { ...x, done: true } : x)) }))}>{tr("Reach out to her")}</button>
                <button className="btn-ghost !py-2" onClick={() => set((p) => ({ ...p, posts: p.posts.map((x) => (x.id === m.postId ? { ...x, hidden: true } : x)), mod: p.mod.map((x) => (x.id === m.id ? { ...x, done: true } : x)) }))}>{tr("Hide post")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div className="card">{s.audit.map((a, i) => <div key={i} className="border-b border-plum-100 py-2 text-sm last:border-0"><span className="text-plum-900/60">{fmtTime(a.at)}</span> · <b>{tr(a.who)}</b>: {tr(a.what)}</div>)}</div>
      )}
    </div>
  );
}
