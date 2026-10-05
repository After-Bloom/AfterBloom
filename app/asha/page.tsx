"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { CheckCircle2, ClipboardCheck, CloudOff, Loader2, Mic, Square } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { PageHead, Disclaimer, fmtDate } from "@/components/ui";
import { useTr } from "@/lib/i18n";
import { rise, stagger } from "@/lib/motion";

// HBNC home visits under the Home-Based Newborn Care programme. Depression screening is not a standard part of these visits.
const HBNC = [3, 7, 14, 21, 28, 42] as const;
type Row = { mother_id: string; full_name: string; baby_name: string; day: number; open_flags: number; last_epds: string | null; last_checkin: string | null; risk: number; risk_factors: number; high_bp: boolean; open_loop: boolean; done: number[] };
type Pending = { mother_id: string; day: number; mood: boolean; note: string };

const QUEUE = "ab.asha.queue", CACHE = "ab.asha.cache";
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };

/** The next visit she is due for, and how far off it is. Visits can be done a few days early. */
const nextVisit = (r: Row) => {
  const d = HBNC.find((x) => !r.done.includes(x) && x <= r.day + 7);
  return d === undefined ? null : { day: d, late: r.day - d };
};

export default function Asha() {
  const tr = useTr();
  const { s } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "due" | "high">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<Pending[]>([]);
  const [listening, setListening] = useState<string | null>(null);
  const rec = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const sb = supabase();
      const ov = await sb.rpc("asha_overview");
      if (ov.error) throw ov.error;
      const visits = await sb.from("asha_visits").select("mother_id, day");
      const done = new Map<string, number[]>();
      (visits.data ?? []).forEach((v: any) => done.set(v.mother_id, [...(done.get(v.mother_id) ?? []), v.day]));
      const list = ((ov.data ?? []) as any[]).map((r) => ({ ...r, done: done.get(r.mother_id) ?? [] })) as Row[];
      setRows(list); write(CACHE, list); setErr(false);
    } catch {
      const cached = read<Row[] | null>(CACHE, null); // offline: show the list from the last time this phone was online, plus visits saved since
      const q = read<Pending[]>(QUEUE, []);
      if (cached) setRows(cached.map((r) => ({ ...r, done: [...new Set([...r.done, ...q.filter((x) => x.mother_id === r.mother_id).map((x) => x.day)])] }))); else setErr(true);
    }
  }, []);

  /** Send visits saved while offline. A visit that fails again stays in the queue. */
  const flush = useCallback(async () => {
    const q = read<Pending[]>(QUEUE, []);
    if (!q.length || !navigator.onLine) return setQueue(q);
    const { data: u } = await supabase().auth.getUser();
    if (!u.user) return setQueue(q);
    const left: Pending[] = [];
    for (const p of q) {
      const { error } = await supabase().from("asha_visits").upsert({ asha_id: u.user.id, mother_id: p.mother_id, day: p.day, mood_screen_done: p.mood, note: p.note || null }, { onConflict: "asha_id,mother_id,day" });
      if (error) left.push(p);
    }
    write(QUEUE, left); setQueue(left);
    if (left.length < q.length) load();
  }, [load]);

  useEffect(() => {
    setQueue(read<Pending[]>(QUEUE, []));
    load(); flush();
    const on = () => { flush(); load(); };
    window.addEventListener("online", on);
    return () => { window.removeEventListener("online", on); rec.current?.stop?.(); };
  }, [load, flush]);

  const markDone = async (r: Row, day: number, mood: boolean) => {
    const key = r.mother_id + day;
    setBusy(key);
    const p: Pending = { mother_id: r.mother_id, day, mood, note: (notes[key] ?? "").trim() };
    write(QUEUE, [...read<Pending[]>(QUEUE, []), p]); // write first, so a visit is never lost if the signal drops
    setRows((rs) => rs && rs.map((x) => (x.mother_id === r.mother_id ? { ...x, done: [...x.done, day] } : x)));
    await flush();
    setNotes((n) => { const { [key]: _, ...rest } = n; return rest; });
    setBusy(null);
  };

  const dictate = (key: string) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert(tr("Voice input is not supported in this browser. Please type."));
    if (listening === key) return rec.current?.stop();
    const r = new SR();
    r.lang = s.lang === "hi" ? "hi-IN" : "en-IN";
    r.onresult = (e: any) => setNotes((n) => ({ ...n, [key]: ((n[key] ? n[key] + " " : "") + e.results[0][0].transcript).slice(0, 500) }));
    r.onend = () => setListening(null);
    rec.current = r; setListening(key); r.start();
  };

  const riskLabel = (n: number) => (n >= 3 ? "High" : n >= 1 ? "Watch" : "Steady");
  const riskCls = (n: number) => (n >= 3 ? "bg-danger/15 text-danger" : n >= 1 ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok");
  const shown = (rows ?? []).filter((r) => (filter === "due" ? !!nextVisit(r) && (nextVisit(r)!.late >= 0) : filter === "high" ? r.risk >= 3 : true));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHead title="ASHA worker dashboard" sub="Mothers in your area, sorted by risk, so you visit the ones who need you most." tag="Stretch" />
      {queue.length > 0 && <p role="status" className="card flex items-center gap-2 border-warn/50 bg-warn/10 text-sm font-semibold"><CloudOff className="h-4 w-4 shrink-0 text-warn" aria-hidden />{tr("{n} visits are saved on this phone and will be sent when you are online.", { n: queue.length })}</p>}
      {err && <p role="alert" className="card text-warn">{tr("Could not load. Please check your connection and try again.")}</p>}
      {rows && rows.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={tr("Show")}>
          {([["all", "All mothers"], ["due", "Visit due or late"], ["high", "High risk"]] as const).map(([k, l]) => <button key={k} className={`chip ${filter === k ? "chip-on" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{tr(l)}</button>)}
        </div>
      )}
      {!rows && !err && <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-28 animate-pulse bg-surface-2" />)}</div>}
      {rows && rows.length === 0 && <div className="card text-ink-muted">{tr("No mothers are assigned to you yet.")}</div>}
      {rows && rows.length > 0 && shown.length === 0 && <div className="card text-ink-muted">{tr("No one matches this filter.")}</div>}
      <m.ul variants={stagger()} initial="hidden" animate="show" className="space-y-3">
        {shown.map((r) => {
          const nv = nextVisit(r);
          const key = nv ? r.mother_id + nv.day : "";
          return (
            <m.li variants={rise} key={r.mother_id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="font-serif text-xl">{tr(r.full_name)}</h2><p className="text-sm text-ink-muted">{tr("Day {n} postpartum", { n: r.day })} · {r.baby_name}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskCls(r.risk)}`}>{tr(riskLabel(r.risk))}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {r.open_flags > 0 && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">{tr("Open flag with her care team")}</span>}
                {r.high_bp && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">{tr("Raised blood pressure in the last 3 days")}</span>}
                {r.open_loop && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-warn">{tr("Has not confirmed she got care")}</span>}
                {r.risk_factors > 0 && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-warn">{tr("{n} risk factors from pregnancy or birth", { n: r.risk_factors })}</span>}
                {r.last_epds && r.last_epds !== "low" && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-warn">{tr("Mood check: care team in touch")}</span>}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-muted">{r.last_checkin ? `${tr("Last check-in")}: ${fmtDate(r.last_checkin)}` : tr("No check-ins yet")}</span>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold text-plum-800">{tr("HBNC visits")}</h3>
                <ol className="flex flex-wrap gap-1.5" aria-label={tr("HBNC visit schedule")}>
                  {HBNC.map((d) => { const dn = r.done.includes(d); return <li key={d} className={`flex h-9 min-w-[3.5rem] items-center justify-center gap-1 rounded-full border px-2 text-xs font-bold ${dn ? "border-ok bg-ok/15 text-ok" : d === nv?.day ? (nv.late > 0 ? "border-danger bg-danger/10 text-danger" : "border-primary bg-plum-100 text-plum-800") : "border-line text-ink-muted"}`}>{dn && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}{tr("Day {n}", { n: d })}</li>; })}
                </ol>
                {nv && <p className={`mt-1.5 text-sm font-semibold ${nv.late > 0 ? "text-danger" : "text-ink-muted"}`}>{nv.late > 0 ? tr("Day {n} visit is {d} days late", { n: nv.day, d: nv.late }) : nv.late === 0 ? tr("Day {n} visit is due today", { n: nv.day }) : tr("Day {n} visit is due in {d} days", { n: nv.day, d: -nv.late })}</p>}
              </div>
              {nv && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-plum-800" htmlFor={`n-${key}`}>{tr("Visit note (optional)")}</label>
                  <div className="flex gap-2">
                    <textarea id={`n-${key}`} className="input min-h-[72px] flex-1 resize-y" maxLength={500} value={notes[key] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))} placeholder={tr("Type or tap the microphone and speak")} />
                    <button className={`btn-soft !px-3 self-start ${listening === key ? "ring-4 ring-primary/30" : ""}`} onClick={() => dictate(key)} aria-label={listening === key ? tr("Stop") : tr("Speak")} aria-pressed={listening === key}>{listening === key ? <Square className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}</button>
                  </div>
                  <p className="text-xs text-ink-muted">{tr("The mother can read notes about her own visits. Write only what you would say to her.")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary !py-2" disabled={!!busy} onClick={() => markDone(r, nv.day, false)}>{busy === key ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ClipboardCheck className="h-4 w-4" aria-hidden />}{tr("Mark day {n} visit done", { n: nv.day })}</button>
                    <button className="btn-soft !py-2" disabled={!!busy} onClick={() => markDone(r, nv.day, true)}>{tr("Done, with a mood check")}</button>
                  </div>
                </div>
              )}
            </m.li>
          );
        })}
      </m.ul>
      <p className="rounded-card bg-plum-100 p-4 text-sm">{tr("Depression screening is not currently part of HBNC home visits (days 3, 7, 14, 21, 28, 42). This dashboard shows you who may need a longer conversation. You see a risk summary only, never the details of her records.")}</p>
      <Disclaimer />
    </div>
  );
}
